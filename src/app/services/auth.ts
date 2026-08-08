import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Usuario, LoginRequest, RolUsuario } from '../models/usuario.model';
import { environment } from '../../environments/environment';
import { mapUsuarioFromBackend, mapUsuarioToBackend, mapRol, mapRolToFrontend } from '../utils/mappers';

export interface UploadPhotoResponse {
  url: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

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
  private lastResetTime = 0;
  private activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

  constructor() {
    const saved = localStorage.getItem('currentUser');
    const token = localStorage.getItem('auth_token');
    if (saved && token) {
      try {
        const user = JSON.parse(saved);
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
    this.lastResetTime = Date.now();
    localStorage.setItem(this.AUTH_LAST_ACTIVITY_KEY, String(this.lastResetTime));
    this.activityEvents.forEach(event => document.addEventListener(event, this.resetInactivityTimer));
    this.setInactivityTimeout();
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    this.activityEvents.forEach(event => document.removeEventListener(event, this.resetInactivityTimer));
  }

  private setInactivityTimeout(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.logout();
    }, this.INACTIVITY_LIMIT_MS);
  }

  private resetInactivityTimer = (): void => {
    const now = Date.now();
    if (now - this.lastResetTime < 10000) {
      return;
    }
    this.lastResetTime = now;
    localStorage.setItem(this.AUTH_LAST_ACTIVITY_KEY, String(now));
    this.setInactivityTimeout();
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

  resetPassword(userId: number, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/reset-password`, {
      userId,
      newPassword,
    });
  }

  verificarUsuario(username: string): Observable<{ existe: boolean }> {
    return this.http.get<{ existe: boolean }>(`${this.apiUrl}/usuarios/verificar-usuario?username=${encodeURIComponent(username)}`);
  }

  recuperarContrasena(username: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/usuarios/recuperar-contrasena`, {
      username,
      newPassword,
    });
  }

  uploadPhoto(file: File): Observable<UploadPhotoResponse> {
    const formData = new FormData();
    formData.append('foto', file);
    return this.http.post<UploadPhotoResponse>(`${this.apiUrl}/usuarios/upload-photo`, formData, {
      headers: { 'X-Skip-Loading': 'true' }
    }).pipe(
      tap(response => {
        const user = this.currentUser();
        if (user) {
          const updated = { ...user, foto: response.url };
          this.currentUser.set(updated);
          localStorage.setItem('currentUser', JSON.stringify(updated));
        }
      })
    );
  }

  deletePhoto(): Observable<any> {
    const user = this.currentUser();
    if (!user) {
      return new Observable(subscriber => subscriber.error('No hay usuario autenticado'));
    }
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${user.id}`, {
      nombre: user.nombre,
      username: user.username,
      email: user.email,
      rol: mapRolToFrontend(user.rol),
      foto: null,
    }, {
      headers: { 'X-Skip-Loading': 'true' }
    }).pipe(
      tap(() => {
        const updated = { ...user, foto: '' };
        this.currentUser.set(updated);
        localStorage.setItem('currentUser', JSON.stringify(updated));
      })
    );
  }

  updateProfile(usuario: Usuario): Observable<any> {
    const body = mapUsuarioToBackend(usuario);
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${usuario.id}`, body, {
      headers: { 'X-Skip-Loading': 'true' }
    }).pipe(
      tap(() => {
        const current = this.currentUser();
        if (current && current.id === usuario.id) {
          const updated = { ...current, ...usuario };
          this.currentUser.set(updated);
          localStorage.setItem('currentUser', JSON.stringify(updated));
        }
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const user = this.currentUser();
    if (!user) {
      return new Observable(subscriber => subscriber.error('No hay usuario autenticado'));
    }
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${user.id}`, {
      nombre: user.nombre,
      username: user.username,
      email: user.email,
      rol: mapRolToFrontend(user.rol),
      password: newPassword,
      currentPassword,
    }, {
      headers: { 'X-Skip-Loading': 'true' }
    });
  }
}
