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
import { AuthService } from '../../services/auth';
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
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // La clase siempre la abre el usuario en sesion, asi que su nombre se lee
  // directo del signal en vez de preguntarlo en un selector.
  currentUser = this.authService.currentUser;

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
  registrandoId = signal<number | null>(null);

  sede = '';
  codigoManual = '';

  readonly sedes = this.asistenciasService.getSedes();

  ngOnInit(): void {
    this.recuperarSesion();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
    this.subscriptions.unsubscribe();
  }

  private recuperarSesion(): void {
    this.subscriptions.add(
      this.asistenciasService.getSesionActual().subscribe({
        next: (sesion) => {
          if (sesion) {
            this.sesion.set(sesion);
            this.sede = sesion.sede;
            this.cargarAlumnos(sesion.id);
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.sesion.set(null);
          this.cdr.detectChanges();
        },
      })
    );
  }

  abrirSesion(): void {
    if (!this.sede) {
      this.notificationService.warning('Selecciona la sede de la clase');
      return;
    }
    this.asistenciasService.abrirSesion(this.sede).subscribe({
      next: (sesion) => {
        this.sesion.set(sesion);
        this.cargarAlumnos(sesion.id);
        // La camara NO se enciende sola: el boton la controla durante toda la clase.
        this.notificationService.success('Clase abierta. Enciende la cámara para escanear.');
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
    if (!sesion || this.registrandoId() !== null) return;
    this.registrandoId.set(alumno.id);
    this.asistenciasService.registrarManual(alumno.id, sesion.id).subscribe({
      next: () => {
        this.registrandoId.set(null);
        this.trasRegistro(alumno.nombre, true, `${alumno.nombre} ${alumno.primerApellido} registrado`);
      },
      error: (e) => {
        this.registrandoId.set(null);
        if (this.esSesionInvalida(e)) {
          this.trasRegistro('', false, this.sesionPerdida(e));
          return;
        }
        this.trasRegistro(alumno.nombre, false, e?.error?.message || 'No se pudo registrar');
      },
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
      error: (e) => {
        this.procesando.set(false);
        if (this.esSesionInvalida(e)) {
          this.trasRegistro('', false, this.sesionPerdida(e));
          return;
        }
        this.trasRegistro('', false, e?.error?.message || 'Código no reconocido');
      },
    });
  }

  // 404 = la clase ya no existe (borrada del reporte). 409 = clase cerrada.
  // El unico 409 que NO es sesion invalida es el duplicado, que el backend
  // marca con duplicado:true, asi que las dos cosas no se confunden.
  private esSesionInvalida(e: HttpErrorResponse): boolean {
    if (e?.status === 404) return true;
    if (e?.status === 409) return e?.error?.duplicado !== true;
    return false;
  }

  // El backend ya no acepta registros para esta clase. Dejar el signal
  // puesto hace que la pantalla siga mostrando "Clase abierta" y que cada
  // intento futuro falle igual, sin forma de recuperarse desde la UI.
  private sesionPerdida(e: HttpErrorResponse): string {
    this.sesion.set(null);
    this.alumnos.set([]);
    this.registrandoId.set(null);
    this.ultimosRegistros.set([]);
    this.detenerCamara();
    this.sede = '';
    this.cdr.detectChanges();
    return `${e?.error?.message || 'La clase ya no esta abierta'}. Abre la clase de nuevo para seguir`;
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
        if (this.esSesionInvalida(e)) {
          this.trasRegistro('', false, this.sesionPerdida(e));
          return;
        }
        this.notificationService.error(e?.error?.message || 'No se pudo eliminar');
        this.cdr.detectChanges();
      },
    });
  }
}
