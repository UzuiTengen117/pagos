import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlumnosService } from '../../../services/alumnos';
import { Alumno } from '../../../models/alumno.model';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumnos.html',
  styleUrl: './alumnos.scss',
})
export class Alumnos {
  private alumnosService = inject(AlumnosService);

  alumnos: Alumno[] = [];
  filtroNombre = '';
  filtroEmail = '';
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  alumnoToDelete: Alumno | null = null;

  formData: Partial<Alumno> = this.getEmptyForm();

  constructor() {
    this.alumnos = this.alumnosService.getAll();
  }

  aplicarFiltros(): void {
    let resultado = this.alumnosService.getAll();

    if (this.filtroNombre) {
      const termino = this.filtroNombre.toLowerCase();
      resultado = resultado.filter(a =>
        a.nombre.toLowerCase().includes(termino) ||
        a.primerApellido.toLowerCase().includes(termino) ||
        a.segundoApellido.toLowerCase().includes(termino)
      );
    }

    if (this.filtroEmail) {
      const termino = this.filtroEmail.toLowerCase();
      resultado = resultado.filter(a =>
        a.email.toLowerCase().includes(termino)
      );
    }

    this.alumnos = resultado;
  }

  limpiarFiltros(): void {
    this.filtroNombre = '';
    this.filtroEmail = '';
    this.alumnos = this.alumnosService.getAll();
  }

  getEmptyForm(): Partial<Alumno> {
    return {
      nombre: '',
      primerApellido: '',
      segundoApellido: '',
      username: '',
      email: '',
      telefono: '',
      grado: '',
      fechaInscripcion: new Date(),
      beca: 0,
      activo: true,
    };
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
  }

  openEditModal(alumno: Alumno): void {
    this.formData = { ...alumno };
    this.isEditing = true;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
  }

  openDeleteModal(alumno: Alumno): void {
    this.alumnoToDelete = alumno;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.alumnoToDelete = null;
  }

  saveAlumno(): void {
    if (this.isEditing && this.formData.id) {
      this.alumnosService.update(this.formData as Alumno);
    } else {
      this.alumnosService.create(this.formData as Omit<Alumno, 'id'>);
    }
    this.alumnos = this.alumnosService.getAll();
    this.closeModal();
  }

  deleteAlumno(): void {
    if (this.alumnoToDelete) {
      this.alumnosService.delete(this.alumnoToDelete.id);
      this.alumnos = this.alumnosService.getAll();
      this.closeDeleteModal();
    }
  }
}
