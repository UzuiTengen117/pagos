import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import jsQR from 'jsqr';
import { AsistenciasService } from '../../services/asistencias';
import { AlumnosService } from '../../services/alumnos';
import { NotificationService } from '../../services/notification';
import { SesionClase, AlumnoEnSesion } from '../../models/asistencia.model';

// Pausa entre lecturas: la camara delivers ~30 frames por segundo y sin esto
// el mismo QR se registraria decenas de veces por segundo.
const SCAN_COOLDOWN_MS = 2500;
const SCAN_INTERVAL_MS = 150;

@Component({
  selector: 'app-escanear-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './escanear-asistencia.html',
  styleUrl: './escanear-asistencia.scss',
})
export class EscanearAsistencia implements OnInit, OnDestroy {
  private asistenciasService = inject(AsistenciasService);
  private alumnosService = inject(AlumnosService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  private stream: MediaStream | null = null;
  private scanLoop: ReturnType<typeof setInterval> | null = null;
  private ultimoEscaneo = 0;
  private subscriptions = new Subscription();

  sesion = signal<SesionClase | null>(null);
  alumnos = signal<AlumnoEnSesion[]>([]);
  ultimosRegistros = signal<{ nombre: string; ok: boolean; mensaje: string }[]>([]);

  camaraActiva = signal(false);
  errorCamara = signal('');
  procesando = signal(false);

  grado = '';
  sede = '';
  codigoManual = '';

  readonly sedes = this.asistenciasService.getSedes();

  ngOnInit(): void {
    this.cargarGrados();
    this.recuperarSesion();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
    this.subscriptions.unsubscribe();
  }

  private cargarGrados(): void {
    this.subscriptions.add(
      this.alumnosService.loadAll().subscribe({
        next: () => this.cdr.detectChanges(),
        error: () => this.cdr.detectChanges(),
      })
    );
  }

  private recuperarSesion(): void {
    this.subscriptions.add(
      this.asistenciasService.getSesionActual().subscribe((sesion) => {
        if (sesion) {
          this.sesion.set(sesion);
          this.grado = sesion.grado;
          this.sede = sesion.sede;
          this.cargarAlumnos(sesion.id);
        }
        this.cdr.detectChanges();
      })
    );
  }

  // Los grados no son una lista fija: se derivan de los alumnos reales,
  // porque en el sistema el grado es texto libre.
  get gradosDisponibles(): string[] {
    const grados = this.alumnosService
      .getAll()
      .map(a => a.grado)
      .filter(g => !!g);
    return [...new Set(grados)].sort();
  }

  abrirSesion(): void {
    if (!this.grado || !this.sede) {
      this.notificationService.warning('Selecciona el grado y la sede de la clase');
      return;
    }
    this.asistenciasService.abrirSesion(this.grado, this.sede).subscribe({
      next: (sesion) => {
        this.sesion.set(sesion);
        this.cargarAlumnos(sesion.id);
        this.notificationService.success('Clase abierta. Ya puedes escanear QR.');
        this.iniciarCamara();
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.notificationService.error(e?.error?.message || 'No se pudo abrir la clase');
        this.cdr.detectChanges();
      },
    });
  }

  cerrarSesion(): void {
    const sesion = this.sesion();
    if (!sesion) return;
    this.asistenciasService.cerrarSesion(sesion.id).subscribe({
      next: () => {
        this.sesion.set(null);
        this.alumnos.set([]);
        this.detenerCamara();
        this.grado = '';
        this.sede = '';
        this.ultimosRegistros.set([]);
        this.notificationService.success('Clase cerrada');
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.notificationService.error(e?.error?.message || 'No se pudo cerrar la clase');
        this.cdr.detectChanges();
      },
    });
  }

  private cargarAlumnos(sesionId: number): void {
    this.asistenciasService.loadAlumnosSesion(sesionId).subscribe({
      next: (data) => {
        this.alumnos.set(data);
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  get totalPresentes(): number {
    return this.alumnos().filter(a => a.asistenciaId !== null).length;
  }

  get totalAlumnos(): number {
    return this.alumnos().length;
  }

  // --- Camara -------------------------------------------------------------

  async iniciarCamara(): Promise<void> {
    this.errorCamara.set('');
    if (!navigator.mediaDevices?.getUserMedia) {
      this.errorCamara.set('Este navegador no permite usar la cámara');
      return;
    }
    const video = this.videoRef?.nativeElement;
    if (!video) {
      this.errorCamara.set('No se pudo preparar la cámara. Recarga la página.');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      video.srcObject = this.stream;
      await video.play();
      this.camaraActiva.set(true);
      this.iniciarLoop();
    } catch {
      this.errorCamara.set('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
      this.camaraActiva.set(false);
      this.detenerCamara();
    }
    this.cdr.detectChanges();
  }

  detenerCamara(): void {
    if (this.scanLoop) {
      clearInterval(this.scanLoop);
      this.scanLoop = null;
    }
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    const video = this.videoRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.camaraActiva.set(false);
  }

  alternarCamara(): void {
    if (this.camaraActiva()) {
      this.detenerCamara();
    } else {
      this.iniciarCamara();
    }
    this.cdr.detectChanges();
  }

  private iniciarLoop(): void {
    this.scanLoop = setInterval(() => this.escanearFrame(), SCAN_INTERVAL_MS);
  }

  private escanearFrame(): void {
    const video = this.videoRef?.nativeElement;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    if (this.procesando()) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const codigo = jsQR(imageData.data, imageData.width, imageData.height);
    if (codigo?.data) {
      this.procesarCodigo(codigo.data);
    }
  }

  // --- Registro -----------------------------------------------------------

  registrarManual(): void {
    const codigo = this.codigoManual.trim();
    if (!codigo) return;
    this.procesarCodigo(codigo);
    this.codigoManual = '';
  }

  registrarAlumnoManual(alumno: AlumnoEnSesion): void {
    const sesion = this.sesion();
    if (!sesion) return;
    this.asistenciasService.registrarManual(alumno.id, sesion.id).subscribe({
      next: () => this.trasRegistro(alumno.nombre, true, `${alumno.nombre} ${alumno.primerApellido} registrado`),
      error: (e) => this.trasRegistro(alumno.nombre, false, e?.error?.message || 'No se pudo registrar'),
    });
  }

  private procesarCodigo(token: string): void {
    const ahora = Date.now();
    if (ahora - this.ultimoEscaneo < SCAN_COOLDOWN_MS) return;
    this.ultimoEscaneo = ahora;

    const sesion = this.sesion();
    if (!sesion) return;

    this.procesando.set(true);
    this.asistenciasService.registrarPorQr(token, sesion.id).subscribe({
      next: (r) => {
        const nombre = `${r.alumno.nombre} ${r.alumno.primer_apellido}`.trim();
        this.trasRegistro(nombre, true, r.duplicado ? `${nombre} ya estaba registrado` : `${nombre} registrado`);
      },
      error: (e) => this.trasRegistro('', false, e?.error?.message || 'Código no reconocido'),
    });
  }

  private trasRegistro(nombre: string, ok: boolean, mensaje: string): void {
    this.procesando.set(false);
    if (ok) {
      this.notificationService.success(mensaje);
    } else {
      this.notificationService.warning(mensaje);
    }
    this.ultimosRegistros.update(lista => [{ nombre, ok, mensaje }, ...lista].slice(0, 5));
    const sesion = this.sesion();
    if (sesion) {
      this.cargarAlumnos(sesion.id);
    }
    this.cdr.detectChanges();
  }

  eliminarAsistencia(alumno: AlumnoEnSesion): void {
    if (!alumno.asistenciaId) return;
    this.asistenciasService.eliminarRegistro(alumno.asistenciaId).subscribe({
      next: () => {
        this.notificationService.info('Asistencia eliminada');
        const sesion = this.sesion();
        if (sesion) this.cargarAlumnos(sesion.id);
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.notificationService.error(e?.error?.message || 'No se pudo eliminar');
        this.cdr.detectChanges();
      },
    });
  }
}
