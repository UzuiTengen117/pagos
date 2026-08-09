import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';
import { ReembolsosService } from '../../../services/reembolsos';
import { PermisosService } from '../../../services/permisos';
import { NotificationService } from '../../../services/notification';
import { RefreshService } from '../../../services/refresh';
import { SolicitudReembolso } from '../../../models/reembolso.model';

@Component({
  selector: 'app-reembolsos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './reembolsos.html',
  styleUrl: './reembolsos.scss',
})
export class Reembolsos implements OnInit, OnDestroy {
  private reembolsosService = inject(ReembolsosService);
  private permisosService = inject(PermisosService);
  private notificationService = inject(NotificationService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  pendientes: SolicitudReembolso[] = [];
  historial: SolicitudReembolso[] = [];
  paginaPendientes = 1;
  paginaHistorial = 1;
  cargandoPendientes = false;
  cargandoHistorial = false;
  tabActivo: 'pendientes' | 'historial' = 'pendientes';

  tieneAprobar = false;
  tieneRechazar = false;
  tieneEditar = false;
  tieneEliminar = false;

  showRechazarModal = false;
  solicitudRechazar: SolicitudReembolso | null = null;
  motivoRechazo = '';

  showAprobarModal = false;
  solicitudAprobar: SolicitudReembolso | null = null;
  motivoAprobacion = '';

  showEditarModal = false;
  solicitudEditar: SolicitudReembolso | null = null;
  editarMotivo = '';
  editarMonto: number | null = null;

  showEliminarModal = false;
  solicitudEliminar: SolicitudReembolso | null = null;

  ngOnInit(): void {
    this.permisosService.getMisPermisos().subscribe({
      next: (res) => {
        this.tieneAprobar = res.permisos.includes('solicitudes_reembolso:aprobar');
        this.tieneRechazar = res.permisos.includes('solicitudes_reembolso:rechazar');
        this.tieneEditar = res.permisos.includes('solicitudes_reembolso:editar');
        this.tieneEliminar = res.permisos.includes('solicitudes_reembolso:eliminar');
      },
      error: () => {}
    });
    this.loadPendientes();
    this.loadHistorial();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => {
      this.loadPendientes();
      this.loadHistorial();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadPendientes(): void {
    this.cargandoPendientes = true;
    this.reembolsosService.loadPendientes().subscribe({
      next: (data) => {
        this.pendientes = data;
        this.paginaPendientes = 1;
        this.cargandoPendientes = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pendientes = [];
        this.cargandoPendientes = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadHistorial(): void {
    this.cargandoHistorial = true;
    this.reembolsosService.loadHistorial().subscribe({
      next: (data) => {
        this.historial = data;
        this.paginaHistorial = 1;
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.historial = [];
        this.cargandoHistorial = false;
        this.cdr.detectChanges();
      }
    });
  }

  setTab(tab: 'pendientes' | 'historial'): void {
    this.tabActivo = tab;
  }

  get pendientesPagina(): SolicitudReembolso[] {
    return paginar(this.pendientes, this.paginaPendientes);
  }

  get historialPagina(): SolicitudReembolso[] {
    return paginar(this.historial, this.paginaHistorial);
  }

  abrirAprobacion(solicitud: SolicitudReembolso): void {
    this.solicitudAprobar = solicitud;
    this.motivoAprobacion = '';
    this.showAprobarModal = true;
  }

  cerrarAprobacion(): void {
    this.showAprobarModal = false;
    this.solicitudAprobar = null;
    this.motivoAprobacion = '';
  }

  confirmarAprobacion(): void {
    if (!this.solicitudAprobar) return;
    if (!this.motivoAprobacion.trim()) {
      this.notificationService.warning('El motivo de la aprobación es requerido');
      return;
    }
    const id = this.solicitudAprobar.id;
    const motivo = this.motivoAprobacion.trim();
    this.reembolsosService.aprobar(id, motivo).subscribe({
      next: () => {
        this.cerrarAprobacion();
        this.notificationService.success('Solicitud aprobada');
      },
      error: () => this.notificationService.error('No se pudo aprobar la solicitud')
    });
  }

  abrirRechazo(solicitud: SolicitudReembolso): void {
    this.solicitudRechazar = solicitud;
    this.motivoRechazo = '';
    this.showRechazarModal = true;
  }

  cerrarRechazo(): void {
    this.showRechazarModal = false;
    this.solicitudRechazar = null;
    this.motivoRechazo = '';
  }

  confirmarRechazo(): void {
    if (!this.solicitudRechazar) return;
    if (!this.motivoRechazo.trim()) {
      this.notificationService.warning('El motivo del rechazo es requerido');
      return;
    }
    const id = this.solicitudRechazar.id;
    const motivo = this.motivoRechazo.trim();
    this.reembolsosService.rechazar(id, motivo).subscribe({
      next: () => {
        this.cerrarRechazo();
        this.notificationService.success('Solicitud rechazada');
      },
      error: () => this.notificationService.error('No se pudo rechazar la solicitud')
    });
  }

  abrirEdicion(solicitud: SolicitudReembolso): void {
    this.solicitudEditar = solicitud;
    this.editarMotivo = solicitud.motivo;
    this.editarMonto = solicitud.monto;
    this.showEditarModal = true;
  }

  cerrarEdicion(): void {
    this.showEditarModal = false;
    this.solicitudEditar = null;
    this.editarMotivo = '';
    this.editarMonto = null;
  }

  guardarEdicion(): void {
    if (!this.solicitudEditar) return;
    if (!this.editarMotivo.trim()) {
      this.notificationService.warning('El motivo es requerido');
      return;
    }
    const id = this.solicitudEditar.id;
    this.reembolsosService.editar(id, this.editarMotivo.trim(), this.editarMonto ?? undefined).subscribe({
      next: () => {
        this.cerrarEdicion();
        this.notificationService.success('Solicitud actualizada');
      },
      error: () => this.notificationService.error('No se pudo actualizar la solicitud')
    });
  }

  reabrir(solicitud: SolicitudReembolso): void {
    this.reembolsosService.reabrir(solicitud.id).subscribe({
      next: () => this.notificationService.success('Solicitud reabierta'),
      error: () => this.notificationService.error('No se pudo reabrir la solicitud')
    });
  }

  abrirEliminar(solicitud: SolicitudReembolso): void {
    this.solicitudEliminar = solicitud;
    this.showEliminarModal = true;
  }

  cerrarEliminar(): void {
    this.showEliminarModal = false;
    this.solicitudEliminar = null;
  }

  confirmarEliminar(): void {
    if (!this.solicitudEliminar) return;
    const id = this.solicitudEliminar.id;
    this.reembolsosService.eliminar(id).subscribe({
      next: () => {
        this.cerrarEliminar();
        this.notificationService.success('Solicitud eliminada');
      },
      error: () => this.notificationService.error('No se pudo eliminar la solicitud')
    });
  }
}
