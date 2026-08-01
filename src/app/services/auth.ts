import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Usuario, LoginRequest, RegisterRequest, RolUsuario } from '../models/usuario.model';
import { environment } from '../../environments/environment';
import { mapUsuarioFromBackend, mapUsuarioToBackend, mapRol } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  currentUser = signal<Usuario | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);

  private readonly INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
  private readonly AUTH_LAST_ACTIVITY_KEY = 'auth_last_activity';
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

  constructor() {
    const saved = localStorage.getItem('currentUser');
    const token = localStorage.getItem('auth_token');
    const lastActivity = Number(localStorage.getItem(this.AUTH_LAST_ACTIVITY_KEY)) || 0;
    if (saved && token) {
      try {
        const user = JSON.parse(saved);
        if (Date.now() - lastActivity > this.INACTIVITY_LIMIT_MS) {
          this.releaseBackendSession(token);
          this.clearSession();
          return;
        }
        this.currentUser.set(user);
        this.startInactivityTimer();
      } catch {
        this.clearSession();
      }
    }
  }

  private releaseBackendSession(token: string): void {
    this.http.post(`${this.apiUrl}/usuarios/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({ error: () => {} });
  }

  private startInactivityTimer(): void {
    this.stopInactivityTimer();
    this.activityEvents.forEach(event => document.addEventListener(event, this.resetInactivityTimer));
    this.resetInactivityTimer();
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    this.activityEvents.forEach(event => document.removeEventListener(event, this.resetInactivityTimer));
  }

  private resetInactivityTimer = (): void => {
    localStorage.setItem(this.AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.logout();
    }, this.INACTIVITY_LIMIT_MS);
  };

  login(request: LoginRequest): Observable<any> {
    return this.http.post<{ token: string; usuario: any }>(`${this.apiUrl}/usuarios/login`, request).pipe(
      tap(response => {
        const user = mapUsuarioFromBackend(response.usuario);
        this.currentUser.set(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('auth_token', response.token);
        this.startInactivityTimer();
      })
    );
  }

  register(request: RegisterRequest): Observable<any> {
    const body = {
      nombre: request.nombre,
      username: request.username,
      email: request.email,
      password: request.password,
      rol: request.rol || 'estudiante',
    };
    return this.http.post<{ token: string; usuario: any }>(`${this.apiUrl}/usuarios/registro`, body).pipe(
      tap(response => {
        const user = mapUsuarioFromBackend(response.usuario);
        this.currentUser.set(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('auth_token', response.token);
        this.startInactivityTimer();
      })
    );
  }

  clearSession(): void {
    this.stopInactivityTimer();
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('auth_token');
    localStorage.removeItem(this.AUTH_LAST_ACTIVITY_KEY);
  }

  logout(): void {
    this.stopInactivityTimer();
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.releaseBackendSession(token);
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/${id}`);
  }

  update(usuario: any): Observable<any> {
    const body = mapUsuarioToBackend(usuario);
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${usuario.id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/usuarios/eliminar/${id}`);
  }

  cambiarRol(id: number, nuevoRol: RolUsuario): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${id}`, {
      rol: nuevoRol === 'administrador' ? 'admin' : nuevoRol === 'estudiante' ? 'estudiante' : nuevoRol,
    });
  }

  resetPassword(username: string, newPassword: string): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`).pipe(
      tap((usuarios: any[]) => {
        const user = usuarios.find((u: any) => u.username === username);
        if (user) {
          this.http.put<any>(`${this.apiUrl}/usuarios/editar/${user.id}`, {
            nombre: user.nombre,
            username: user.username,
            email: user.email,
            password: newPassword,
            rol: user.rol,
          }).subscribe();
        }
      })
    );
  }

  getUsuarioIdByUsername(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`);
  }
}
