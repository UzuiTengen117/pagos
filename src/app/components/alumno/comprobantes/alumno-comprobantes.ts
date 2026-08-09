import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';
import { AuthService } from '../../../services/auth';
import { ComprobantesService } from '../../../services/comprobantes';
import { AlumnosService } from '../../../services/alumnos';
import { RefreshService } from '../../../services/refresh';
import { ReembolsosService } from '../../../services/reembolsos';
import { NotificationService } from '../../../services/notification';
import { Comprobante } from '../../../models/comprobante.model';
import { SolicitudReembolso } from '../../../models/reembolso.model';

const DIAS_LIMITE = 7;

@Component({
  selector: 'app-alumno-comprobantes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './alumno-comprobantes.html',
  styleUrl: './alumno-comprobantes.scss',
})
export class AlumnoComprobantes implements OnInit, OnDestroy {
  readonly DIAS_LIMITE = DIAS_LIMITE;

  private authService = inject(AuthService);
  private comprobantesService = inject(ComprobantesService);
  private alumnosService = inject(AlumnosService);
  private reembolsosService = inject(ReembolsosService);
  private notificationService = inject(NotificationService);
  private refreshService = inject(RefreshService);
  private sanitizer = inject(DomSanitizer);
  private refreshSub?: Subscription;

  currentUser = this.authService.currentUser;
  showPreviewModal = false;
  comprobantePreview: Comprobante | null = null;
  filtroFechaInicio = '';
  filtroFechaFin = '';
  pagina = 1;
  showReembolsoModal = false;
  reembolsoComprobante: Comprobante | null = null;
  reembolsoMotivo = '';
  reembolsoMonto: number | null = null;
  enviandoReembolso = false;

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.comprobantesService.loadAll().subscribe();
    this.alumnosService.loadAll().subscribe();
    this.reembolsosService.loadAll().subscribe();
  }

  get misComprobantes(): Comprobante[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.usuarioId === usuario.id
    );
    if (!alumno) return [];
    let comprobantes = this.comprobantesService.getAll().filter(
      c => c.alumnoId === alumno.id
    );

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      comprobantes = comprobantes.filter(c => {
        const fecha = new Date(c.fechaEmision);
        return fecha >= inicio && fecha <= fin;
      });
    }

    return comprobantes;
  }

  get misComprobantesPagina(): Comprobante[] {
    return paginar(this.misComprobantes, this.pagina);
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.pagina = 1;
  }

  solicitudDe(comprobante: Comprobante): SolicitudReembolso | undefined {
    return this.reembolsosService.getAll().find(s => s.comprobanteId === comprobante.id);
  }

  diasDesdeEmision(comprobante: Comprobante): number {
    return (Date.now() - new Date(comprobante.fechaEmision).getTime()) / (24 * 60 * 60 * 1000);
  }

  puedeSolicitar(comprobante: Comprobante): boolean {
    return !this.solicitudDe(comprobante) && this.diasDesdeEmision(comprobante) <= DIAS_LIMITE;
  }

  abrirSolicitud(comprobante: Comprobante): void {
    this.reembolsoComprobante = comprobante;
    this.reembolsoMotivo = '';
    this.reembolsoMonto = null;
    this.showReembolsoModal = true;
  }

  cerrarSolicitud(): void {
    this.showReembolsoModal = false;
    this.reembolsoComprobante = null;
    this.reembolsoMotivo = '';
    this.reembolsoMonto = null;
  }

  enviarSolicitud(): void {
    if (!this.reembolsoComprobante || !this.reembolsoMotivo.trim()) {
      this.notificationService.warning('Escribe un motivo para la solicitud');
      return;
    }
    this.enviandoReembolso = true;
    const comprobante = this.reembolsoComprobante;
    this.reembolsosService.create({
      comprobante_id: comprobante.id,
      pago_id: comprobante.pagoId || undefined,
      monto: this.reembolsoMonto ?? undefined,
      motivo: this.reembolsoMotivo.trim(),
    }).subscribe({
      next: () => {
        this.enviandoReembolso = false;
        this.cerrarSolicitud();
        this.notificationService.success('Solicitud de reembolso enviada');
      },
      error: (err) => {
        this.enviandoReembolso = false;
        const detalle = err?.error?.message || err?.error || '';
        this.notificationService.error(detalle ? `No se pudo enviar la solicitud: ${detalle}` : 'No se pudo enviar la solicitud');
      }
    });
  }

  openPreview(comprobante: Comprobante): void {
    this.comprobantePreview = comprobante;
    this.showPreviewModal = true;
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.comprobantePreview = null;
  }

  printComprobante(): void {
    const printContent = document.getElementById('comprobante-print');
    if (!printContent) return;

    const windowprint = window.open('', '_blank', 'width=800,height=600');
    if (!windowprint) return;

    const sanitizedContent = this.sanitizer.sanitize(1, printContent.innerHTML) || '';

    windowprint.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Pago</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; padding: 2rem; color: #1e293b; }
          .comprobante { max-width: 700px; margin: 0 auto; border: 2px solid #1e1b4b; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e1b4b, #4f46e5); color: white; padding: 1.5rem; text-align: center; }
          .header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
          .header p { opacity: 0.8; font-size: 0.85rem; }
          .folio-bar { background: #f1f5f9; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; font-size: 0.85rem; }
          .folio-bar strong { color: #4f46e5; }
          .body { padding: 1.5rem; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
          .info-item label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 0.25rem; }
          .info-item span { font-size: 0.95rem; font-weight: 500; }
          .monto-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 1.25rem; text-align: center; margin-bottom: 1.5rem; }
          .monto-box .label { font-size: 0.8rem; color: #166534; font-weight: 600; text-transform: uppercase; }
          .monto-box .amount { font-size: 2rem; font-weight: 800; color: #166534; }
          .observaciones { background: #f8fafc; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
          .observaciones label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 0.25rem; }
          .footer { border-top: 2px solid #e2e8f0; padding: 1rem 1.5rem; text-align: center; font-size: 0.8rem; color: #64748b; }
          .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
          .status.activo { background: #dcfce7; color: #166534; }
          .status.cancelado { background: #fee2e2; color: #991b1b; }
          @media print { body { padding: 0; } .comprobante { border: 2px solid #000; } }
        </style>
      </head>
      <body>
        ${sanitizedContent}
      </body>
      </html>
    `);
    windowprint.document.close();
    windowprint.print();
  }
}
