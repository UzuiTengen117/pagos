import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, tap } from 'rxjs';
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

export interface DuplicateSessionInfo {
  username: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  currentUser = signal<Usuario | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);

  showDuplicateSessionModal = signal<boolean>(false);
  duplicateSessionInfo = signal<DuplicateSessionInfo | null>(null);
  private pendingLoginRequest = signal<LoginRequest | null>(null);
  private duplicateLoginConfirmed = new Subject<LoginRequest>();

  private readonly INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
  private readonly AUTH_LAST_ACTIVITY_KEY = 'auth_last_activity';
  private readonly TAB_ID_KEY = 'auth_tab_id';
  private readonly ACTIVE_SESSIONS_KEY = 'active_user_sessions';
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private lastResetTime = 0;
  private activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

  private tabId: string;
  private broadcastChannel: BroadcastChannel | null = null;

  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private tabKey(key: string): string {
    return `${this.tabId}_${key}`;
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.tabKey('auth_token'));
  }

  constructor() {
    this.tabId = sessionStorage.getItem(this.TAB_ID_KEY) || AuthService.generateUUID();
    sessionStorage.setItem(this.TAB_ID_KEY, this.tabId);

    this.initBroadcastChannel();

    const saved = sessionStorage.getItem(this.tabKey('currentUser'));
    const token = sessionStorage.getItem(this.tabKey('auth_token'));
    if (saved && token) {
      try {
        const user = JSON.parse(saved);
        this.currentUser.set(user);
        this.registerActiveSession(user.username, token);
        this.startInactivityTimer();
      } catch {
        this.clearSession();
      }
    }
  }

  private initBroadcastChannel(): void {
    this.broadcastChannel = new BroadcastChannel('auth_channel');
    this.broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'FORCE_LOGOUT') {
        const token = this.getToken();
        if (token) {
          this.releaseBackendSession(token);
        }
        this.clearSession();
        this.router.navigate(['/login']);
      }
    };
  }

  private getActiveSessions(): Record<string, { tabId: string; timestamp: number; token?: string }> {
    const data = localStorage.getItem(this.ACTIVE_SESSIONS_KEY);
    return data ? JSON.parse(data) : {};
  }

  private saveActiveSessions(sessions: Record<string, { tabId: string; timestamp: number; token?: string }>): void {
    localStorage.setItem(this.ACTIVE_SESSIONS_KEY, JSON.stringify(sessions));
  }

  private registerActiveSession(username: string, token?: string): void {
    const sessions = this.getActiveSessions();
    sessions[username] = { tabId: this.tabId, timestamp: Date.now(), token };
    this.saveActiveSessions(sessions);
  }

  private removeActiveSession(username: string): void {
    const sessions = this.getActiveSessions();
    delete sessions[username];
    this.saveActiveSessions(sessions);
  }

  checkDuplicateSession(username: string): boolean {
    const sessions = this.getActiveSessions();
    const existingSession = sessions[username];
    if (existingSession && existingSession.tabId !== this.tabId) {
      if (Date.now() - existingSession.timestamp > this.INACTIVITY_LIMIT_MS) {
        delete sessions[username];
        this.saveActiveSessions(sessions);
        return false;
      }
      return true;
    }
    return false;
  }

  requestLogin(request: LoginRequest): void {
    this.pendingLoginRequest.set(request);
    this.duplicateSessionInfo.set({
      username: request.username,
      timestamp: Date.now()
    });
    this.showDuplicateSessionModal.set(true);
  }

  confirmDuplicateLogin(): void {
    const info = this.duplicateSessionInfo();
    if (info) {
      const sessions = this.getActiveSessions();
      const existingSession = sessions[info.username];
      if (existingSession) {
        if (existingSession.token) {
          this.releaseBackendSession(existingSession.token);
        }
        this.broadcastChannel?.postMessage({
          type: 'FORCE_LOGOUT',
          tabId: existingSession.tabId
        });
        delete sessions[info.username];
        this.saveActiveSessions(sessions);
      }
    }
    const request = this.pendingLoginRequest();
    this.showDuplicateSessionModal.set(false);
    this.duplicateSessionInfo.set(null);
    this.pendingLoginRequest.set(null);
    if (request) {
      this.duplicateLoginConfirmed.next(request);
    }
  }

  cancelDuplicateLogin(): void {
    this.showDuplicateSessionModal.set(false);
    this.duplicateSessionInfo.set(null);
    this.pendingLoginRequest.set(null);
  }

  onDuplicateLoginConfirmed(): Observable<LoginRequest> {
    return this.duplicateLoginConfirmed.asObservable();
  }

  private releaseBackendSession(token: string): void {
    this.http.post(`${this.apiUrl}/usuarios/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({ error: () => {} });
  }

  private startInactivityTimer(): void {
    this.stopInactivityTimer();
    this.lastResetTime = Date.now();
    sessionStorage.setItem(this.tabKey(this.AUTH_LAST_ACTIVITY_KEY), String(this.lastResetTime));
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
    sessionStorage.setItem(this.tabKey(this.AUTH_LAST_ACTIVITY_KEY), String(now));
    this.setInactivityTimeout();
  };

  login(request: LoginRequest): Observable<any> {
    return this.http.post<{ token: string; usuario: any }>(`${this.apiUrl}/usuarios/login`, request).pipe(
      tap(response => {
        const user = mapUsuarioFromBackend(response.usuario);
        this.currentUser.set(user);
        sessionStorage.setItem(this.tabKey('currentUser'), JSON.stringify(user));
        sessionStorage.setItem(this.tabKey('auth_token'), response.token);
        this.registerActiveSession(user.username, response.token);
        this.startInactivityTimer();
      })
    );
  }

  clearSession(): void {
    this.stopInactivityTimer();
    const user = this.currentUser();
    if (user) {
      this.removeActiveSession(user.username);
    }
    this.currentUser.set(null);
    sessionStorage.removeItem(this.tabKey('currentUser'));
    sessionStorage.removeItem(this.tabKey('auth_token'));
    sessionStorage.removeItem(this.tabKey(this.AUTH_LAST_ACTIVITY_KEY));
  }

  logout(): void {
    this.stopInactivityTimer();
    const token = this.getToken();
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
          sessionStorage.setItem(this.tabKey('currentUser'), JSON.stringify(updated));
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
        sessionStorage.setItem(this.tabKey('currentUser'), JSON.stringify(updated));
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
          sessionStorage.setItem(this.tabKey('currentUser'), JSON.stringify(updated));
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
