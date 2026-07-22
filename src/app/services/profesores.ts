import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth';
import { RolUsuario, Usuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class ProfesoresService {
  private authService = inject(AuthService);

  getAllProfesores(): Usuario[] {
    return this.authService.getByRol('profesor');
  }

  getAllAdmins(): Usuario[] {
    return this.authService.getByRol('administrador');
  }

  create(usuario: Omit<Usuario, 'id' | 'fechaCreacion'>): void {
    this.authService.create(usuario);
  }

  update(usuario: Usuario): void {
    this.authService.update(usuario);
  }

  delete(id: number): void {
    this.authService.delete(id);
  }

  cambiarRol(id: number, nuevoRol: RolUsuario): void {
    this.authService.cambiarRol(id, nuevoRol);
  }
}
