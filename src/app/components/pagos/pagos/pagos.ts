import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { Pago } from '../../../models/pago.model';
import { Alumno } from '../../../models/alumno.model';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss',
})
export class Pagos {
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);

  pagos: Pago[] = [];
  alumnos: Alumno[] = [];
  filtroNombre = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  pagoToDelete: Pago | null = null;

  formData: {
    alumnoId: number | null;
    concepto: string;
    monto: number;
    semana: number;
    mes: string;
    estado: 'pagado' | 'pendiente' | 'vencido';
  } = this.getEmptyForm();

  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  constructor() {
    this.pagos = this.pagosService.getAll();
    this.alumnos = this.alumnosService.getAll();
  }

  getEmptyForm() {
    return {
      alumnoId: null as number | null,
      concepto: '',
      monto: 0,
      semana: 1,
      mes: 'Enero',
      estado: 'pendiente' as 'pagado' | 'pendiente' | 'vencido',
    };
  }

  aplicarFiltros(): void {
    let resultado = this.pagosService.getAll();

    if (this.filtroNombre) {
      resultado = this.pagosService.filtrarPorNombre(this.filtroNombre);
    }

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      resultado = resultado.filter(p => {
        const fecha = new Date(p.fechaPago);
        return fecha >= inicio && fecha <= fin;
      });
    }

    this.pagos = resultado;
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.pagos = this.pagosService.getAll();
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
  }

  openEditModal(pago: Pago): void {
    this.formData = {
      alumnoId: pago.alumnoId,
      concepto: pago.concepto,
      monto: pago.monto,
      semana: pago.semana,
      mes: pago.mes,
      estado: pago.estado,
    };
    this.isEditing = true;
    this.pagoToDelete = pago;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.pagoToDelete = null;
  }

  savePago(): void {
    if (!this.formData.alumnoId || !this.formData.concepto.trim() || !this.formData.monto || this.formData.monto <= 0) {
      return;
    }

    const alumnoId = Number(this.formData.alumnoId);
    const alumno = this.alumnosService.getById(alumnoId);
    if (!alumno) return;

    if (this.isEditing && this.pagoToDelete) {
      this.pagosService.update({
        id: this.pagoToDelete.id,
        alumnoId: alumno.id,
        alumnoNombre: `${alumno.nombre} ${alumno.primerApellido}`,
        monto: Number(this.formData.monto),
        concepto: this.formData.concepto,
        fechaPago: new Date(),
        estado: this.formData.estado,
        semana: Number(this.formData.semana),
        mes: this.formData.mes,
      });
    } else {
      this.pagosService.create({
        alumnoId: alumno.id,
        alumnoNombre: `${alumno.nombre} ${alumno.primerApellido}`,
        monto: Number(this.formData.monto),
        concepto: this.formData.concepto,
        fechaPago: new Date(),
        estado: this.formData.estado,
        semana: Number(this.formData.semana),
        mes: this.formData.mes,
      });
    }

    this.pagos = this.pagosService.getAll();
    this.closeModal();
  }

  openDeleteModal(pago: Pago): void {
    this.pagoToDelete = pago;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.pagoToDelete = null;
  }

  deletePago(): void {
    if (this.pagoToDelete) {
      this.pagosService.delete(this.pagoToDelete.id);
      this.pagos = this.pagosService.getAll();
      this.closeDeleteModal();
    }
  }
}
