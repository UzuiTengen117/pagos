import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { BecasService } from '../../../services/becas';
import { Beca } from '../../../models/beca.model';

@Component({
  selector: 'app-becas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './becas.html',
  styleUrl: './becas.scss',
})
export class Becas implements OnInit, OnDestroy {
  private becasService = inject(BecasService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routerSub?: Subscription;

  becas: Beca[] = [];
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  becaToDelete: Beca | null = null;

  formData: Partial<Beca> = this.getEmptyForm();

  ngOnInit(): void {
    this.loadBecas();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.loadBecas());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  loadBecas(): void {
    this.becasService.loadAll().subscribe({
      next: (data) => {
        this.becas = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.becas = [];
        this.cdr.detectChanges();
      }
    });
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
      this.becasService.update(this.formData as Beca).subscribe({
        next: () => {
          this.closeModal();
          this.loadBecas();
        },
        error: () => {
          this.closeModal();
          this.loadBecas();
        }
      });
    } else {
      this.becasService.create(this.formData as Omit<Beca, 'id'>).subscribe({
        next: () => {
          this.closeModal();
          this.loadBecas();
        },
        error: () => {
          this.closeModal();
          this.loadBecas();
        }
      });
    }
  }

  deleteBeca(): void {
    if (this.becaToDelete) {
      this.becasService.delete(this.becaToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadBecas();
        },
        error: () => {
          this.closeDeleteModal();
          this.loadBecas();
        }
      });
    }
  }
}
