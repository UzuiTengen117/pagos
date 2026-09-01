import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Usuario, RolUsuario } from '../models/usuario.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import { mapUsuarioFromBackend, mapRolToFrontend, mapUsuarioToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class ProfesoresService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
  private apiUrl = environment.apiUrl;

  getAllProfesores(): Observable<Usuario[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`).pipe(
      map(users => users
        .filter(u => u.rol === 'profesor')
        .map(mapUsuarioFromBackend)
      )
    );
  }

  getAllAdmins(): Observable<Usuario[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`).pipe(
      map(users => users
        .filter(u => u.rol === 'admin')
        .map(mapUsuarioFromBackend)
      )
    );
  }

  getAll(): Observable<Usuario[]> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`).pipe(
      map(users => users.map(mapUsuarioFromBackend))
    );
  }

  create(usuario: any, password?: string): Observable<any> {
    const body = mapUsuarioToBackend(usuario);
    if (password) {
      body.password = password;
    }
    return this.http.post<any>(`${this.apiUrl}/usuarios/registro`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  update(usuario: Usuario, password?: string): Observable<any> {
    const body = mapUsuarioToBackend(usuario);
    if (password) {
      body.password = password;
    }
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${usuario.id}`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/usuarios/eliminar/${id}`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  cambiarRol(id: number, nuevoRol: RolUsuario): Observable<any> {
    return this.http.get<any[]>(`${this.apiUrl}/usuarios`).pipe(
      map(users => users.find((u: any) => u.id === id)),
      tap((user: any) => {
        if (user) {
          this.http.put<any>(`${this.apiUrl}/usuarios/editar/${id}`, {
            nombre: user.nombre,
            username: user.username,
            email: user.email,
            rol: mapRolToFrontend(nuevoRol),
          }).subscribe({
            next: () => this.refreshService.refresh(),
          });
        }
      })
    );
  }
}
