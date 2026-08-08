import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InscripcionesService } from '../../../services/inscripciones';
import { ComprobantesService } from '../../../services/comprobantes';
import { AlumnosService } from '../../../services/alumnos';
import { PreciosService } from '../../../services/precios';
import { RefreshService } from '../../../services/refresh';
import { Inscripcion } from '../../../models/inscripcion.model';
import { Alumno } from '../../../models/alumno.model';
import { Precio } from '../../../models/precio.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inscripciones.html',
  styleUrl: './inscripciones.scss',
})
export class Inscripciones implements OnInit, OnDestroy {
  private router = inject(Router);
  private inscripcionesService = inject(InscripcionesService);
  private comprobantesService = inject(ComprobantesService);
  private alumnosService = inject(AlumnosService);
  private preciosService = inject(PreciosService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  inscripciones: Inscripcion[] = [];
  alumnos: Alumno[] = [];
  precios: Precio[] = [];
  datosInicialesCargados = false;
  alumnosCargados = false;
  preciosCargados = false;

  get precioInscripcion(): Precio | undefined {
    return this.precios.find(p => p.concepto.toLowerCase().includes('inscripcion'));
  }
  filtroNombre = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  mensajeError = '';
  mensajeExito = '';

  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  inscripcionToDelete: Inscripcion | null = null;

  formData: {
    alumnoId: number | null;
    precioId: number | null;
    monto: number;
    montoOriginal: number;
    becaPorcentaje: number;
    concepto: string;
    cicloEscolar: string;
    estado: 'pagado' | 'pendiente' | 'vencido';
    metodoPago: string;
    notas: string;
  } = this.getEmptyForm();

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.recargarInscripciones());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.alumnosService.loadAll().subscribe({
      next: (alumnosData) => {
        this.alumnos = alumnosData;
        this.alumnosCargados = true;
        this.completarCargaInicial();
        this.cdr.detectChanges();
      },
      error: () => {
        this.alumnos = [];
        this.alumnosCargados = true;
        this.completarCargaInicial();
        this.cdr.detectChanges();
      }
    });

    this.preciosService.loadAll().subscribe({
      next: (preciosData) => {
        this.precios = preciosData;
        this.preciosCargados = true;
        this.completarCargaInicial();
        this.cdr.detectChanges();
      },
      error: () => {
        this.precios = [];
        this.preciosCargados = true;
        this.completarCargaInicial();
        this.cdr.detectChanges();
      }
    });

    this.inscripcionesService.loadAll().subscribe({
      next: (data) => {
        if (!this.datosInicialesCargados) {
          this.inscripciones = data;
        }
        this.completarCargaInicial();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });
  }

  getEmptyForm() {
    const year = new Date().getFullYear();
    return {
      alumnoId: null as number | null,
      precioId: null as number | null,
      monto: 0,
      montoOriginal: 0,
      becaPorcentaje: 0,
      concepto: '',
      cicloEscolar: `${year}-${year + 1}`,
      estado: 'pendiente' as 'pagado' | 'pendiente' | 'vencido',
      metodoPago: 'efectivo',
      notas: '',
    };
  }

  onAlumnoChange(): void {
    if (!this.formData.alumnoId) {
      this.formData.precioId = null;
      this.formData.monto = 0;
      this.formData.montoOriginal = 0;
      this.formData.becaPorcentaje = 0;
      this.formData.concepto = '';
      this.cdr.detectChanges();
      return;
    }

    const alumno = this.alumnosService.getById(this.formData.alumnoId);
    if (alumno) {
      this.formData.becaPorcentaje = alumno.beca;
    }

    const precio = this.precioInscripcion;
    if (precio) {
      this.formData.precioId = precio.id;
      this.formData.concepto = precio.concepto;
      this.calcularMonto();
    }
    this.cdr.detectChanges();
  }

  onPrecioSelect(precioId: number): void {
    if (!precioId) return;

    const precio = this.precios.find(p => p.id === precioId);
    if (!precio) return;

    this.formData.precioId = precioId;
    this.formData.concepto = precio.concepto;
    this.calcularMonto();
    this.cdr.detectChanges();
  }

  private calcularMonto(): void {
    if (!this.formData.alumnoId || !this.formData.precioId) {
      this.formData.monto = 0;
      this.formData.montoOriginal = 0;
      return;
    }

    const alumno = this.alumnosService.getById(this.formData.alumnoId);
    const precio = this.precios.find(p => p.id === this.formData.precioId);

    if (!alumno || !precio) return;

    const becaPorcentaje = alumno.beca;
    const montoOriginal = precio.monto;
    const descuento = montoOriginal * (becaPorcentaje / 100);
    const monto = montoOriginal - descuento;

    this.formData.montoOriginal = montoOriginal;
    this.formData.becaPorcentaje = becaPorcentaje;
    this.formData.monto = monto;
  }

  aplicarFiltros(): void {
    let resultado = this.inscripcionesService.getAll();

    if (this.filtroNombre) {
      const termino = this.filtroNombre.toLowerCase();
      resultado = resultado.filter(i =>
        i.alumnoNombre.toLowerCase().includes(termino)
      );
    }

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      resultado = resultado.filter(i => {
        const fecha = new Date(i.fechaInscripcion);
        return fecha >= inicio && fecha <= fin;
      });
    }

    this.inscripciones = resultado;
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.inscripcionesService.loadAll().subscribe({
      next: (data) => {
        this.inscripciones = data;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  openEditModal(inscripcion: Inscripcion): void {
    this.formData = {
      alumnoId: inscripcion.alumnoId,
      precioId: inscripcion.precioId,
      monto: inscripcion.monto,
      montoOriginal: inscripcion.montoOriginal,
      becaPorcentaje: inscripcion.becaPorcentaje,
      concepto: '',
      cicloEscolar: inscripcion.cicloEscolar,
      estado: inscripcion.estado,
      metodoPago: inscripcion.metodoPago,
      notas: inscripcion.notas,
    };
    this.isEditing = true;
    this.inscripcionToDelete = inscripcion;
    this.showModal = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.inscripcionToDelete = null;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  saveInscripcion(): void {
    this.mensajeError = '';

    if (!this.formData.alumnoId) {
      this.mensajeError = 'Selecciona un alumno.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.formData.precioId) {
      this.mensajeError = 'Selecciona un tipo de pago.';
      this.cdr.detectChanges();
      return;
    }
    if (this.formData.monto <= 0) {
      this.mensajeError = 'El monto debe ser mayor a 0.';
      this.cdr.detectChanges();
      return;
    }

    const alumnoId = Number(this.formData.alumnoId);
    const alumno = this.alumnosService.getById(alumnoId);
    if (!alumno) {
      this.mensajeError = 'El alumno seleccionado no es valido.';
      this.cdr.detectChanges();
      return;
    }

    const inscripcionData = {
      alumnoId: alumno.id,
      alumnoNombre: `${alumno.nombre} ${alumno.primerApellido}`,
      monto: Number(this.formData.monto),
      montoOriginal: Number(this.formData.montoOriginal),
      becaPorcentaje: this.formData.becaPorcentaje,
      precioId: Number(this.formData.precioId),
      fechaInscripcion: new Date(),
      cicloEscolar: this.formData.cicloEscolar.trim(),
      estado: this.formData.estado,
      metodoPago: this.formData.metodoPago,
      notas: this.formData.notas.trim(),
    };

    const operation = this.isEditing && this.inscripcionToDelete
      ? this.inscripcionesService.update({ ...inscripcionData, id: this.inscripcionToDelete.id })
      : this.inscripcionesService.create(inscripcionData);

    operation.subscribe({
      next: (response: any) => {
        const inscripcionId = response?.id;
        if (!this.isEditing && inscripcionId) {
          this.inscripciones = [...this.inscripciones, { ...inscripcionData, id: inscripcionId }];
          this.comprobantesService.create({
            alumnoId: inscripcionData.alumnoId,
            alumnoNombre: inscripcionData.alumnoNombre,
            alumnoEmail: alumno.email || '',
            pagoId: null as any,
            concepto: `Inscripcion - ${inscripcionData.cicloEscolar}`,
            monto: inscripcionData.monto,
            metodoPago: inscripcionData.metodoPago as any,
            estado: 'activo',
            observaciones: inscripcionData.notas || '',
          }).subscribe({
            next: () => {
              this.mensajeExito = 'Inscripcion registrada y comprobante generado.';
              this.cdr.detectChanges();
              setTimeout(() => this.router.navigate(['/comprobantes']), 800);
            },
            error: () => {
              this.mensajeExito = 'Inscripcion registrada correctamente.';
              this.cdr.detectChanges();
              setTimeout(() => this.closeModal(), 800);
            },
          });
        } else {
          this.mensajeExito = 'Inscripcion actualizada correctamente.';
          this.cdr.detectChanges();
          setTimeout(() => this.closeModal(), 800);
        }
      },
      error: (err) => {
        console.error('Error guardando inscripcion:', err);
        this.mensajeError = err.error?.message || 'Error al guardar la inscripcion. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteModal(inscripcion: Inscripcion): void {
    this.inscripcionToDelete = inscripcion;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.inscripcionToDelete = null;
    this.cdr.detectChanges();
  }

  deleteInscripcion(): void {
    if (!this.inscripcionToDelete) return;

    this.inscripcionesService.delete(this.inscripcionToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.recargarInscripciones();
      },
      error: (err) => {
        console.error('Error eliminando inscripcion:', err);
        this.mensajeError = err.error?.message || 'Error al eliminar la inscripcion.';
        this.closeDeleteModal();
        this.cdr.detectChanges();
      }
    });
  }

  private recargarInscripciones(): void {
    this.inscripcionesService.loadAll().subscribe({
      next: (data) => {
        this.inscripciones = data;
        this.completarCargaInicial();
        this.cdr.detectChanges();
      },
    });
  }

  private completarCargaInicial(): void {
    if (!this.alumnosCargados || !this.preciosCargados || this.inscripciones.length === 0) return;
    this.datosInicialesCargados = true;
    const precioIns = this.precioInscripcion;
    this.inscripciones = this.inscripciones.map(i => {
      if ((!i.alumnoNombre || !i.alumnoNombre.trim()) && i.alumnoId) {
        const a = this.alumnos.find(al => al.id === i.alumnoId);
        if (a) {
          i.alumnoNombre = `${a.nombre} ${a.primerApellido} ${a.segundoApellido}`.trim();
        }
      }
      if (!i.montoOriginal || i.montoOriginal === 0) {
        const p = i.precioId ? this.precios.find(pr => pr.id === i.precioId) : precioIns;
        const a = i.alumnoId ? this.alumnos.find(al => al.id === i.alumnoId) : null;
        if (p) {
          i.precioId = p.id;
          i.montoOriginal = p.monto;
          const beca = a?.beca ?? 0;
          i.monto = p.monto - (p.monto * (beca / 100));
          i.becaPorcentaje = beca;
        }
      }
      return i;
    });
    this.cdr.detectChanges();
  }

  descargarExcel(): void {
    const datos = this.inscripciones.map(i => ({
      'ID': i.id,
      'Alumno': i.alumnoNombre,
      'Monto Original': i.montoOriginal,
      'Descuento': i.becaPorcentaje > 0 ? `${i.becaPorcentaje}%` : '-',
      'Monto Final': i.monto,
      'Fecha': new Date(i.fechaInscripcion).toLocaleDateString('es-MX'),
      'Estado': i.estado.charAt(0).toUpperCase() + i.estado.slice(1),
      'Metodo de Pago': i.metodoPago.charAt(0).toUpperCase() + i.metodoPago.slice(1),
      'Notas': i.notas || '-',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
    ];

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `inscripciones_resumen_${fecha}.xlsx`);
  }
}
