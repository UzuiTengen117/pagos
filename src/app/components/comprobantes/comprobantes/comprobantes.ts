import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';
import { ComprobantesService } from '../../../services/comprobantes';
import { AlumnosService } from '../../../services/alumnos';
import { PagosService } from '../../../services/pagos';
import { RefreshService } from '../../../services/refresh';
import { Comprobante } from '../../../models/comprobante.model';
import { Alumno } from '../../../models/alumno.model';
import { Pago } from '../../../models/pago.model';

@Component({
  selector: 'app-comprobantes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './comprobantes.html',
  styleUrl: './comprobantes.scss',
})
export class Comprobantes implements OnInit, OnDestroy {
  private comprobantesService = inject(ComprobantesService);
  private alumnosService = inject(AlumnosService);
  private pagosService = inject(PagosService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);
  private refreshSub?: Subscription;

  comprobantes: Comprobante[] = [];
  alumnos: Alumno[] = [];
  pagos: Pago[] = [];
  pagosAlumno: Pago[] = [];
  pagina = 1;
  filtroNombre = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  mensajeError = '';
  mensajeExito = '';

  showModal = false;
  showPreviewModal = false;
  showDeleteModal = false;
  showEditModal = false;
  comprobantePreview: Comprobante | null = null;
  comprobanteToDelete: Comprobante | null = null;
  comprobanteToEdit: Comprobante | null = null;
  editFecha = '';

  formData = this.getEmptyForm();

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.recargarComprobantes());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.comprobantesService.loadAll().subscribe({
      next: (data) => {
        this.comprobantes = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.comprobantes = [];
        this.mensajeError = 'Error al cargar comprobantes.';
        this.cdr.detectChanges();
      }
    });

    this.alumnosService.loadAll().subscribe({
      next: (data) => {
        this.alumnos = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.alumnos = [];
        this.cdr.detectChanges();
      }
    });

    this.pagosService.loadAll().subscribe({
      next: (data) => {
        this.pagos = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pagos = [];
      }
    });
  }

  getEmptyForm() {
    return {
      alumnoId: 0,
      pagoId: 0,
      concepto: '',
      monto: 0,
      metodoPago: 'efectivo' as const,
      observaciones: '',
    };
  }

  onAlumnoChange(): void {
    const alumnoId = Number(this.formData.alumnoId);
    if (!alumnoId) {
      this.pagosAlumno = [];
      this.formData.pagoId = 0;
      this.cdr.detectChanges();
      return;
    }
    this.pagosAlumno = this.pagos.filter(p => p.alumnoId === alumnoId);
    this.formData.pagoId = 0;
    this.formData.concepto = '';
    this.formData.monto = 0;
    this.cdr.detectChanges();
  }

  onPagoChange(): void {
    const pagoId = Number(this.formData.pagoId);
    if (!pagoId) {
      this.formData.concepto = '';
      this.formData.monto = 0;
      this.cdr.detectChanges();
      return;
    }
    const pago = this.pagos.find(p => p.id === pagoId);
    if (pago) {
      this.formData.concepto = pago.concepto;
      this.formData.monto = pago.monto;
    }
    this.cdr.detectChanges();
  }

  get comprobantesPagina(): Comprobante[] {
    return paginar(this.comprobantes, this.pagina);
  }

  aplicarFiltros(): void {
    this.pagina = 1;
    let resultado = this.comprobantesService.getAll();

    if (this.filtroNombre) {
      const termino = this.filtroNombre.toLowerCase();
      resultado = resultado.filter(c =>
        c.alumnoNombre.toLowerCase().includes(termino)
      );
    }

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      resultado = resultado.filter(c => {
        const fecha = new Date(c.fechaEmision);
        return fecha >= inicio && fecha <= fin;
      });
    }

    this.comprobantes = resultado;
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    this.pagina = 1;
    this.filtroNombre = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.comprobantesService.loadAll().subscribe({
      next: (data) => {
        this.comprobantes = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.comprobantes = [];
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.showModal = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  saveComprobante(): void {
    this.mensajeError = '';
    const alumnoId = Number(this.formData.alumnoId);

    if (!alumnoId) {
      this.mensajeError = 'Selecciona un alumno.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.formData.concepto.trim()) {
      this.mensajeError = 'Ingresa un concepto.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.formData.monto || this.formData.monto <= 0) {
      this.mensajeError = 'El monto debe ser mayor a 0.';
      this.cdr.detectChanges();
      return;
    }

    const alumno = this.alumnosService.getById(alumnoId);
    if (!alumno) {
      this.mensajeError = 'El alumno no es valido.';
      this.cdr.detectChanges();
      return;
    }

    this.comprobantesService.create({
      pagoId: Number(this.formData.pagoId) || 0,
      alumnoId: alumno.id,
      alumnoNombre: `${alumno.nombre} ${alumno.primerApellido} ${alumno.segundoApellido}`,
      alumnoEmail: alumno.email,
      concepto: this.formData.concepto,
      monto: Number(this.formData.monto),
      estado: 'activo',
      metodoPago: this.formData.metodoPago,
      observaciones: this.formData.observaciones,
    }).subscribe({
      next: () => {
        this.mensajeExito = 'Comprobante generado correctamente.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.closeModal();
          this.recargarComprobantes();
        }, 800);
      },
      error: (err) => {
        this.mensajeError = err.error?.message || 'Error al generar el comprobante.';
        this.cdr.detectChanges();
      }
    });
  }

  openPreview(comprobante: Comprobante): void {
    this.comprobantePreview = comprobante;
    this.showPreviewModal = true;
    this.cdr.detectChanges();
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.comprobantePreview = null;
    this.cdr.detectChanges();
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

  openEditModal(comprobante: Comprobante): void {
    this.comprobanteToEdit = comprobante;
    const fecha = comprobante.fechaEmision instanceof Date ? comprobante.fechaEmision : new Date(comprobante.fechaEmision);
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    this.editFecha = `${y}-${m}-${d}`;
    this.showEditModal = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.comprobanteToEdit = null;
    this.editFecha = '';
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  saveFechaEdit(): void {
    if (!this.comprobanteToEdit) return;
    if (!this.editFecha) {
      this.mensajeError = 'Selecciona una fecha válida.';
      this.cdr.detectChanges();
      return;
    }
    this.mensajeError = '';
    const nuevaFecha = new Date(this.editFecha + 'T12:00:00');
    this.comprobantesService.updateFecha(this.comprobanteToEdit.id, nuevaFecha).subscribe({
      next: () => {
        this.mensajeExito = 'Fecha actualizada correctamente.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.closeEditModal();
          this.recargarComprobantes();
        }, 800);
      },
      error: (err) => {
        this.mensajeError = err.error?.message || 'Error al actualizar la fecha.';
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteModal(comprobante: Comprobante): void {
    this.comprobanteToDelete = comprobante;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.comprobanteToDelete = null;
    this.cdr.detectChanges();
  }

  cancelarComprobante(comprobante: Comprobante): void {
    this.comprobantesService.cancelar(comprobante.id).subscribe({
      next: () => {
        this.recargarComprobantes();
      },
      error: () => {
        this.mensajeError = 'Error al cancelar el comprobante.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteComprobante(): void {
    if (!this.comprobanteToDelete) return;

    this.comprobantesService.delete(this.comprobanteToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.recargarComprobantes();
      },
      error: (err) => {
        this.mensajeError = err.error?.message || 'Error al eliminar el comprobante.';
        this.closeDeleteModal();
        this.cdr.detectChanges();
      }
    });
  }

  private recargarComprobantes(): void {
    this.pagina = 1;
    this.comprobantesService.loadAll().subscribe({
      next: (data) => {
        this.comprobantes = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.comprobantes = [];
        this.cdr.detectChanges();
      }
    });
  }
}
