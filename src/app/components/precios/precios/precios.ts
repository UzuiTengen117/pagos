import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PreciosService } from '../../../services/precios';
import { Precio } from '../../../models/precio.model';

@Component({
  selector: 'app-precios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './precios.html',
  styleUrl: './precios.scss',
})
export class Precios {
  private preciosService = inject(PreciosService);

  precios: Precio[] = [];
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  precioToDelete: Precio | null = null;

  formData: Partial<Precio> = this.getEmptyForm();

  constructor() {
    this.precios = this.preciosService.getAll();
  }

  getEmptyForm(): Partial<Precio> {
    return {
      concepto: '',
      monto: 0,
      tipo: 'mensualidad',
    };
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
  }

  openEditModal(precio: Precio): void {
    this.formData = { ...precio };
    this.isEditing = true;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
  }

  openDeleteModal(precio: Precio): void {
    this.precioToDelete = precio;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.precioToDelete = null;
  }

  savePrecio(): void {
    if (this.isEditing && this.formData.id) {
      this.preciosService.update(this.formData as Precio);
    } else {
      this.preciosService.create(this.formData as Omit<Precio, 'id'>);
    }
    this.precios = this.preciosService.getAll();
    this.closeModal();
  }

  deletePrecio(): void {
    if (this.precioToDelete) {
      this.preciosService.delete(this.precioToDelete.id);
      this.precios = this.preciosService.getAll();
      this.closeDeleteModal();
    }
  }
}
