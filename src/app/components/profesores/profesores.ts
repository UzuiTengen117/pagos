import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfesoresService } from '../../services/profesores';
import { Usuario, RolUsuario } from '../../models/usuario.model';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profesores.html',
  styleUrl: './profesores.scss',
})
export class Profesores {
  private profesoresService: ProfesoresService = inject(ProfesoresService);

  usuarios: Usuario[] = [];
  filtroRol: RolUsuario | 'todos' = 'todos';
  showModal = false;
  showDeleteModal = false;
  showRolModal = false;
  isEditing = false;
  usuarioToDelete: Usuario | null = null;
  usuarioRol: Usuario | null = null;
  nuevoRol: RolUsuario = 'profesor';

  formData: Partial<Usuario> = this.getEmptyForm();

  constructor() {
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    if (this.filtroRol === 'todos') {
      this.usuarios = [...this.profesoresService.getAllProfesores(), ...this.profesoresService.getAllAdmins()];
    } else if (this.filtroRol === 'profesor') {
      this.usuarios = this.profesoresService.getAllProfesores();
    } else {
      this.usuarios = this.profesoresService.getAllAdmins();
    }
  }

  getEmptyForm(): Partial<Usuario> {
    return {
      nombre: '',
      primerApellido: '',
      segundoApellido: '',
      username: '',
      password: '',
      rol: 'profesor',
    };
  }

  onFiltroRolChange(): void {
    this.loadUsuarios();
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
  }

  openEditModal(usuario: Usuario): void {
    this.formData = { ...usuario, password: '' };
    this.isEditing = true;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
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
      this.profesoresService.update(this.formData as Usuario);
    } else {
      this.profesoresService.create(this.formData as Omit<Usuario, 'id' | 'fechaCreacion'>);
    }
    this.loadUsuarios();
    this.closeModal();
  }

  deleteUsuario(): void {
    if (this.usuarioToDelete) {
      this.profesoresService.delete(this.usuarioToDelete.id);
      this.loadUsuarios();
      this.closeDeleteModal();
    }
  }

  cambiarRol(): void {
    if (this.usuarioRol) {
      this.profesoresService.cambiarRol(this.usuarioRol.id, this.nuevoRol);
      this.loadUsuarios();
      this.closeRolModal();
    }
  }
}
