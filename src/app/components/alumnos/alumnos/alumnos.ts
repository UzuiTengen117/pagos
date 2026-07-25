import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AlumnosService } from '../../../services/alumnos';
import { BecasService } from '../../../services/becas';
import { ProfesoresService } from '../../../services/profesores';
import { Alumno } from '../../../models/alumno.model';
import { Beca } from '../../../models/beca.model';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'app-alumnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumnos.html',
  styleUrl: './alumnos.scss',
})
export class Alumnos implements OnInit, OnDestroy {
  private alumnosService = inject(AlumnosService);
  private becasService = inject(BecasService);
  private profesoresService = inject(ProfesoresService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routerSub?: Subscription;

  alumnos: Alumno[] = [];
  becas: Beca[] = [];
  usuariosEstudiantes: Usuario[] = [];
  filtroNombre = '';
  filtroEmail = '';
  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  alumnoToDelete: Alumno | null = null;

  formData: Partial<Alumno> = this.getEmptyForm();

  ngOnInit(): void {
    this.loadAlumnos();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.loadAlumnos());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  loadBecas(): void {
    this.becasService.loadAll().subscribe({
      next: (data) => {
        this.becas = data.filter(b => b.activa);
        this.cdr.detectChanges();
      },
      error: () => {
        this.becas = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadAlumnos(): void {
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
    this.loadBecas();
  }

  loadUsuariosEstudiantes(): void {
    this.profesoresService.getAll().subscribe({
      next: (usuarios) => {
        this.usuariosEstudiantes = usuarios.filter(u => u.rol === 'estudiante');
        this.cdr.detectChanges();
      },
      error: () => {
        this.usuariosEstudiantes = [];
        this.cdr.detectChanges();
      }
    });
  }

  onBecaChange(becaId: number | null): void {
    if (!becaId) {
      this.formData.becaId = undefined;
      this.formData.beca = 0;
      this.cdr.detectChanges();
      return;
    }
    const beca = this.becas.find(b => b.id === becaId);
    if (beca) {
      this.formData.becaId = beca.id;
      this.formData.beca = beca.porcentaje;
      this.cdr.detectChanges();
    }
  }

  onUsuarioChange(usuarioId: number | null): void {
    if (!usuarioId) {
      this.formData.usuarioId = undefined;
      return;
    }
    const usuario = this.usuariosEstudiantes.find(u => u.id === usuarioId);
    if (usuario) {
      this.formData.usuarioId = usuario.id;
      this.formData.nombre = usuario.nombre;
      this.formData.username = usuario.username;
      this.formData.email = usuario.email;
      this.cdr.detectChanges();
    }
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
      usuarioId: undefined,
      becaId: undefined,
    };
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
    this.loadUsuariosEstudiantes();
    this.loadBecas();
  }

  openEditModal(alumno: Alumno): void {
    this.formData = { ...alumno };
    this.isEditing = true;
    this.showModal = true;
    this.loadUsuariosEstudiantes();
    this.loadBecas();
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.usuariosEstudiantes = [];
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
      this.alumnosService.update(this.formData as Alumno).subscribe({
        next: () => {
          this.closeModal();
          this.loadAlumnos();
        },
        error: () => {
          this.closeModal();
          this.loadAlumnos();
        }
      });
    } else {
      this.alumnosService.create(this.formData as Omit<Alumno, 'id'>).subscribe({
        next: () => {
          this.closeModal();
          this.loadAlumnos();
        },
        error: () => {
          this.closeModal();
          this.loadAlumnos();
        }
      });
    }
  }

  deleteAlumno(): void {
    if (this.alumnoToDelete) {
      this.alumnosService.delete(this.alumnoToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadAlumnos();
        },
        error: () => {
          this.closeDeleteModal();
          this.loadAlumnos();
        }
      });
    }
  }
}
