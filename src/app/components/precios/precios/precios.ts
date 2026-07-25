import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { PreciosService } from '../../../services/precios';
import { Precio } from '../../../models/precio.model';

@Component({
  selector: 'app-precios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './precios.html',
  styleUrl: './precios.scss',
})
export class Precios implements OnInit, OnDestroy {
  private preciosService = inject(PreciosService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routerSub?: Subscription;

  precios: Precio[] = [];
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  precioToDelete: Precio | null = null;
  mensajeError = '';
  mensajeExito = '';

  formData: Partial<Precio> = this.getEmptyForm();

  ngOnInit(): void {
    this.loadPrecios();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.loadPrecios());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  loadPrecios(): void {
    this.preciosService.loadAll().subscribe({
      next: (data) => {
        this.precios = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.precios = [];
        this.cdr.detectChanges();
      }
    });
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
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  openEditModal(precio: Precio): void {
    this.formData = { ...precio };
    this.isEditing = true;
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

  openDeleteModal(precio: Precio): void {
    this.precioToDelete = precio;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.precioToDelete = null;
    this.cdr.detectChanges();
  }

  savePrecio(): void {
    this.mensajeError = '';

    if (!this.formData.concepto?.trim()) {
      this.mensajeError = 'Ingresa un concepto.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.formData.monto || this.formData.monto <= 0) {
      this.mensajeError = 'El monto debe ser mayor a 0.';
      this.cdr.detectChanges();
      return;
    }

    if (this.isEditing && this.formData.id) {
      this.preciosService.update(this.formData as Precio).subscribe({
        next: () => {
          this.mensajeExito = 'Tipo de pago actualizado correctamente.';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.closeModal();
            this.loadPrecios();
          }, 800);
        },
        error: (err) => {
          this.mensajeError = err.error?.message || 'Error al actualizar el tipo de pago.';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.preciosService.create(this.formData as Omit<Precio, 'id'>).subscribe({
        next: () => {
          this.mensajeExito = 'Tipo de pago creado correctamente.';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.closeModal();
            this.loadPrecios();
          }, 800);
        },
        error: (err) => {
          this.mensajeError = err.error?.message || 'Error al crear el tipo de pago.';
          this.cdr.detectChanges();
        }
      });
    }
  }

  deletePrecio(): void {
    if (this.precioToDelete) {
      this.preciosService.delete(this.precioToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadPrecios();
        },
        error: () => {
          this.closeDeleteModal();
          this.loadPrecios();
        }
      });
    }
  }
}
