import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ModulosPermisos, MisPermisos, PermisoSeleccion } from '../models/permiso.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getModulos(): Observable<ModulosPermisos> {
    return this.http.get<ModulosPermisos>(`${this.apiUrl}/permisos/modulos`);
  }

  getMisPermisos(): Observable<MisPermisos> {
    return this.http.get<MisPermisos>(`${this.apiUrl}/permisos/mis`);
  }

  getPermisosUsuario(id: number): Observable<{ permisos: string[] }> {
    return this.http.get<{ permisos: string[] }>(`${this.apiUrl}/permisos/usuario/${id}`);
  }

  getDefaults(rol: string): Observable<{ permisos: string[] }> {
    return this.http.get<{ permisos: string[] }>(`${this.apiUrl}/permisos/defaults/${rol}`);
  }

  updatePermisos(id: number, permisos: PermisoSeleccion[]): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/permisos/usuario/${id}`, { permisos });
  }
}
