import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';
import QRCode from 'qrcode';
import { AsistenciasService } from '../../../services/asistencias';
import { NotificationService } from '../../../services/notification';
import { MiQr, MiAsistencia } from '../../../models/asistencia.model';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';

// El backend firma el token con 60s de vigencia. Se renueva cada 45s para
// que nunca haya un QR en pantalla que ya expire al momento de escanear.
const REFRESH_TOKEN_MS = 45 * 1000;
const SEGUNDOS_TOKEN = REFRESH_TOKEN_MS / 1000;

@Component({
  selector: 'app-alumno-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './alumno-asistencia.html',
  styleUrl: './alumno-asistencia.scss',
})
export class AlumnoAsistencia implements OnInit, OnDestroy {
  private asistenciasService = inject(AsistenciasService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  private subscriptions = new Subscription();

  miQr = signal<MiQr | null>(null);
  qrDataUrl = signal<string>('');
  cargando = true;
  errorQr = signal('');

  // Cuenta regresiva para que el alumno vea cuando se renueva el codigo.
  segundosParaRenovar = signal(SEGUNDOS_TOKEN);

  pagina = 1;
  asistencias: MiAsistencia[] = [];

  ngOnInit(): void {
    this.cargarQr();
    this.cargarHistorial();

    this.subscriptions.add(
      interval(REFRESH_TOKEN_MS).subscribe(() => this.cargarQr())
    );
    this.subscriptions.add(
      interval(1000).subscribe(() => {
        this.segundosParaRenovar.update(s => (s <= 1 ? SEGUNDOS_TOKEN : s - 1));
      })
    );

    // Los navegadores frenan los temporizadores en pestanas en segundo plano.
    // Al volver a esta pestana el QR puede estar vencido, asi que se renueva de inmediato.
    document.addEventListener('visibilitychange', this.alVolverVisible);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.removeEventListener('visibilitychange', this.alVolverVisible);
  }

  private alVolverVisible = (): void => {
    if (document.visibilityState === 'visible') {
      this.cargarQr();
    }
  };

  private cargarQr(): void {
    this.asistenciasService.getMiQr().subscribe({
      next: (miQr) => {
        this.miQr.set(miQr);
        this.errorQr.set('');
        this.cargando = false;
        this.segundosParaRenovar.set(SEGUNDOS_TOKEN);
        this.generarImagen(miQr.token);
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.miQr.set(null);
        this.qrDataUrl.set('');
        this.errorQr.set(this.explicarError(e));
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Un fallo de red o un backend sin esta ruta no se arregla recargando,
  // asi que el mensaje dice que hacer en vez de sugerir recargar.
  private explicarError(e: HttpErrorResponse): string {
    if (e.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    }
    if (e.status === 404) {
      return 'El servidor todavía no tiene habilitada la asistencia por QR.';
    }
    if (e.status === 401 || e.status === 403) {
      return e?.error?.message || 'Tu sesión no tiene acceso a esta función.';
    }
    return e?.error?.message || 'No se pudo generar tu código de asistencia.';
  }

  private generarImagen(token: string): void {
    QRCode.toDataURL(token, { width: 320, margin: 2, errorCorrectionLevel: 'M' }).then(
      url => this.qrDataUrl.set(url),
      () => this.qrDataUrl.set('')
    );
  }

  private cargarHistorial(): void {
    this.asistenciasService.loadMisAsistencias().subscribe({
      next: (data) => {
        this.asistencias = data;
        this.pagina = 1;
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges(),
    });
  }

  get nombreCompleto(): string {
    const a = this.miQr()?.alumno;
    if (!a) return '';
    return `${a.nombre} ${a.primerApellido} ${a.segundoApellido}`.trim();
  }

  get iniciales(): string {
    const a = this.miQr()?.alumno;
    if (!a) return '';
    return `${a.nombre.charAt(0)}${a.primerApellido.charAt(0)}`.toUpperCase();
  }

  get asistenciasPagina(): MiAsistencia[] {
    return paginar(this.asistencias, this.pagina);
  }

  copiarToken(): void {
    const token = this.miQr()?.token;
    if (!token) return;
    navigator.clipboard?.writeText(token).then(
      () => this.notificationService.success('Código copiado'),
      () => this.notificationService.error('No se pudo copiar')
    );
  }
}
