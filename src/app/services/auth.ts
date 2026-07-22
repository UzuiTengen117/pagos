import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Usuario, LoginRequest, RegisterRequest, RolUsuario } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private usuarios = signal<Usuario[]>([
    { id: 1, nombre: 'Admin', primerApellido: 'Sistema', segundoApellido: '', username: 'admin', password: 'admin123', rol: 'administrador', fechaCreacion: new Date() },
    { id: 2, nombre: 'Carlos', primerApellido: 'García', segundoApellido: 'López', username: 'profesor1', password: 'prof123', rol: 'profesor', fechaCreacion: new Date() },
    { id: 3, nombre: 'María', primerApellido: 'Hernández', segundoApellido: 'Ruiz', username: 'alumno1', password: 'alu123', rol: 'alumno', fechaCreacion: new Date() },
  ]);

  currentUser = signal<Usuario | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);

  constructor(private router: Router) {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      this.currentUser.set(JSON.parse(saved));
    }
  }

  login(request: LoginRequest): boolean {
    const user = this.usuarios().find(
      u => u.username === request.username && u.password === request.password
    );
    if (user) {
      this.currentUser.set(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  }

  register(request: RegisterRequest): boolean {
    const exists = this.usuarios().find(u => u.username === request.username);
    if (exists) return false;

    const newUser: Usuario = {
      id: this.usuarios().length + 1,
      nombre: request.nombre,
      primerApellido: request.primerApellido,
      segundoApellido: request.segundoApellido,
      username: request.username,
      password: request.password,
      rol: 'alumno',
      fechaCreacion: new Date(),
    };
    this.usuarios.update(list => [...list, newUser]);
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  getAll(): Usuario[] {
    return this.usuarios();
  }

  getByRol(rol: RolUsuario): Usuario[] {
    return this.usuarios().filter(u => u.rol === rol);
  }

  create(usuario: Omit<Usuario, 'id' | 'fechaCreacion'>): void {
    const newUser: Usuario = {
      ...usuario,
      id: this.usuarios().length + 1,
      fechaCreacion: new Date(),
    };
    this.usuarios.update(list => [...list, newUser]);
  }

  update(usuario: Usuario): void {
    this.usuarios.update(list =>
      list.map(u => (u.id === usuario.id ? usuario : u))
    );
  }

  delete(id: number): void {
    this.usuarios.update(list => list.filter(u => u.id !== id));
  }

  cambiarRol(id: number, nuevoRol: RolUsuario): void {
    this.usuarios.update(list =>
      list.map(u => (u.id === id ? { ...u, rol: nuevoRol } : u))
    );
  }

  resetPassword(username: string, newPassword: string): boolean {
    const user = this.usuarios().find(u => u.username === username);
    if (!user) return false;

    this.usuarios.update(list =>
      list.map(u => (u.username === username ? { ...u, password: newPassword } : u))
    );
    return true;
  }
}
