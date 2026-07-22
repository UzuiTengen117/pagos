import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BecasService } from '../../../services/becas';
import { Beca } from '../../../models/beca.model';

@Component({
  selector: 'app-becas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './becas.html',
  styleUrl: './becas.scss',
})
export class Becas {
  private becasService = inject(BecasService);

  becas: Beca[] = [];
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  becaToDelete: Beca | null = null;

  formData: Partial<Beca> = this.getEmptyForm();

  constructor() {
    this.becas = this.becasService.getAll();
  }

  getEmptyForm(): Partial<Beca> {
    return {
      nombre: '',
      porcentaje: 50,
      descripcion: '',
      activa: true,
    };
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
  }

  openEditModal(beca: Beca): void {
    this.formData = { ...beca };
    this.isEditing = true;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
  }

  openDeleteModal(beca: Beca): void {
    this.becaToDelete = beca;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.becaToDelete = null;
  }

  saveBeca(): void {
    if (this.isEditing && this.formData.id) {
      this.becasService.update(this.formData as Beca);
    } else {
      this.becasService.create(this.formData as Omit<Beca, 'id'>);
    }
    this.becas = this.becasService.getAll();
    this.closeModal();
  }

  deleteBeca(): void {
    if (this.becaToDelete) {
      this.becasService.delete(this.becaToDelete.id);
      this.becas = this.becasService.getAll();
      this.closeDeleteModal();
    }
  }
}
