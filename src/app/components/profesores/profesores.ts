import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ProfesoresService } from '../../services/profesores';
import { AlumnosService } from '../../services/alumnos';
import { BecasService } from '../../services/becas';
import { Usuario, RolUsuario } from '../../models/usuario.model';
import { Alumno } from '../../models/alumno.model';
import { Beca } from '../../models/beca.model';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profesores.html',
  styleUrl: './profesores.scss',
})
export class Profesores implements OnInit, OnDestroy {
  private profesoresService = inject(ProfesoresService);
  private alumnosService = inject(AlumnosService);
  private becasService = inject(BecasService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routerSub?: Subscription;

  allUsuarios: Usuario[] = [];
  usuarios: Usuario[] = [];
  alumnosDisponibles: Alumno[] = [];
  estudiantesExistentes: Usuario[] = [];
  becas: Beca[] = [];
  filtroRol: RolUsuario | 'todos' = 'todos';
  showModal = false;
  showDeleteModal = false;
  showRolModal = false;
  isEditing = false;
  usuarioToDelete: Usuario | null = null;
  usuarioRol: Usuario | null = null;
  nuevoRol: RolUsuario = 'profesor';

  selectedAlumnoId: number | null = null;
  selectedBecaId: number | null = null;

  formData: Partial<Usuario> = this.getEmptyForm();

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.loadAllUsuarios());
    this.loadAllUsuarios();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  loadAllUsuarios(): void {
    this.profesoresService.getAll().subscribe({
      next: (usuarios) => {
        this.allUsuarios = usuarios;
        this.aplicarFiltro();
        this.cdr.detectChanges();
      },
      error: () => {
        this.allUsuarios = [];
        this.usuarios = [];
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltro(): void {
    if (this.filtroRol === 'todos') {
      this.usuarios = [...this.allUsuarios];
    } else {
      this.usuarios = this.allUsuarios.filter(u => u.rol === this.filtroRol);
    }
  }

  getEmptyForm(): Partial<Usuario> {
    return {
      nombre: '',
      username: '',
      email: '',
      password: '',
      rol: 'profesor',
    };
  }

  onFiltroRolChange(): void {
    this.aplicarFiltro();
  }

  onRolChange(): void {
    if (this.formData.rol === 'estudiante') {
      this.loadAlumnosDisponibles();
      this.cargarEstudiantesExistentes();
      this.loadBecas();
    } else {
      this.alumnosDisponibles = [];
      this.estudiantesExistentes = [];
      this.becas = [];
      this.selectedAlumnoId = null;
      this.selectedBecaId = null;
    }
  }

  loadAlumnosDisponibles(): void {
    this.alumnosService.getDisponibles().subscribe({
      next: (data) => {
        this.alumnosDisponibles = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.alumnosDisponibles = [];
        this.cdr.detectChanges();
      }
    });
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

  cargarEstudiantesExistentes(): void {
    this.profesoresService.getAll().subscribe({
      next: (usuarios) => {
        this.estudiantesExistentes = usuarios.filter(u => u.rol === 'estudiante');
        this.cdr.detectChanges();
      },
      error: () => {
        this.estudiantesExistentes = [];
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.selectedAlumnoId = null;
    this.selectedBecaId = null;
    this.alumnosDisponibles = [];
    this.estudiantesExistentes = [];
    this.becas = [];
    this.showModal = true;
  }

  openEditModal(usuario: Usuario): void {
    this.formData = { ...usuario, password: '' };
    this.isEditing = true;
    this.selectedAlumnoId = null;
    this.selectedBecaId = null;
    this.alumnosDisponibles = [];
    this.estudiantesExistentes = [];
    this.becas = [];
    if (usuario.rol === 'estudiante') {
      this.loadAlumnosDisponibles();
      this.cargarEstudiantesExistentes();
      this.loadBecas();
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.selectedAlumnoId = null;
    this.selectedBecaId = null;
    this.alumnosDisponibles = [];
    this.estudiantesExistentes = [];
    this.becas = [];
  }

  openDeleteModal(usuario: Usuario): void {
    this.usuarioToDelete = usuario;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.usuarioToDelete = null;
  }

  openRolModal(usuario: Usuario): void {
    this.usuarioRol = usuario;
    this.nuevoRol = usuario.rol;
    this.showRolModal = true;
  }

  closeRolModal(): void {
    this.showRolModal = false;
    this.usuarioRol = null;
  }

  saveUsuario(): void {
    if (this.isEditing && this.formData.id) {
      this.profesoresService.update(this.formData as Usuario).subscribe({
        next: (res) => {
          if (this.formData.rol === 'estudiante' && this.selectedAlumnoId) {
            this.vincularAlumno(res.id || this.formData.id);
          } else {
            this.closeModal();
            this.loadAllUsuarios();
          }
        },
        error: () => {
          this.closeModal();
          this.loadAllUsuarios();
        }
      });
    } else {
      this.profesoresService.create(this.formData).subscribe({
        next: (res) => {
          if (this.formData.rol === 'estudiante' && this.selectedAlumnoId) {
            this.vincularAlumno(res.usuario?.id || res.id);
          } else {
            this.closeModal();
            this.loadAllUsuarios();
          }
        },
        error: () => {
          this.closeModal();
          this.loadAllUsuarios();
        }
      });
    }
  }

  private vincularAlumno(usuarioId: number): void {
    if (!this.selectedAlumnoId || !usuarioId) {
      this.closeModal();
      this.loadAllUsuarios();
      return;
    }
    const alumno = this.alumnosDisponibles.find(a => a.id === this.selectedAlumnoId);
    if (!alumno) {
      this.closeModal();
      this.loadAllUsuarios();
      return;
    }
    this.alumnosService.update({
      ...alumno,
      usuarioId: usuarioId,
      becaId: this.selectedBecaId ?? undefined,
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadAllUsuarios();
      },
      error: () => {
        this.closeModal();
        this.loadAllUsuarios();
      }
    });
  }

  deleteUsuario(): void {
    if (this.usuarioToDelete) {
      this.profesoresService.delete(this.usuarioToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadAllUsuarios();
        },
        error: () => {
          this.closeDeleteModal();
          this.loadAllUsuarios();
        }
      });
    }
  }

  cambiarRol(): void {
    if (this.usuarioRol) {
      this.profesoresService.cambiarRol(this.usuarioRol.id, this.nuevoRol).subscribe({
        next: () => {
          this.closeRolModal();
          this.loadAllUsuarios();
        },
        error: () => {
          this.closeRolModal();
          this.loadAllUsuarios();
        }
      });
    }
  }
}
