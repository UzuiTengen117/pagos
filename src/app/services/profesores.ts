import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { AuthService } from './auth';
import { Usuario, RolUsuario } from '../models/usuario.model';
import { environment } from '../../environments/environment';
import { mapUsuarioFromBackend, mapRolToFrontend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class ProfesoresService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
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

  create(usuario: any): Observable<any> {
    const body = {
      nombre: usuario.nombre,
      username: usuario.username,
      email: usuario.email,
      password: usuario.password,
      rol: mapRolToFrontend(usuario.rol),
    };
    return this.http.post<any>(`${this.apiUrl}/usuarios/registro`, body);
  }

  update(usuario: Usuario): Observable<any> {
    const body: any = {
      nombre: usuario.nombre,
      username: usuario.username,
      email: usuario.email,
      rol: mapRolToFrontend(usuario.rol),
    };
    if (usuario.password) {
      body.password = usuario.password;
    }
    return this.http.put<any>(`${this.apiUrl}/usuarios/editar/${usuario.id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/usuarios/eliminar/${id}`);
  }

  cambiarRol(id: number, nuevoRol: RolUsuario): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/${id}`).pipe(
      tap((user: any) => {
        this.http.put<any>(`${this.apiUrl}/usuarios/editar/${id}`, {
          nombre: user.nombre,
          username: user.username,
          email: user.email,
          rol: mapRolToFrontend(nuevoRol),
        }).subscribe();
      })
    );
  }
}
