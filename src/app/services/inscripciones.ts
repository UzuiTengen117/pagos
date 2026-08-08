import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Inscripcion } from '../models/inscripcion.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import { mapInscripcionFromBackend, mapInscripcionToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class InscripcionesService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
  private apiUrl = environment.apiUrl;
  private inscripciones = signal<Inscripcion[]>([]);

  loadAll(): Observable<Inscripcion[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inscripciones`).pipe(
      map(data => data.map(mapInscripcionFromBackend)),
      map(data => {
        this.inscripciones.set(data);
        return data;
      })
    );
  }

  getAll(): Inscripcion[] {
    return this.inscripciones();
  }

  create(inscripcion: Omit<Inscripcion, 'id'>): Observable<any> {
    const body = mapInscripcionToBackend(inscripcion);
    return this.http.post<any>(`${this.apiUrl}/inscripciones/agregar`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  update(inscripcion: Inscripcion): Observable<any> {
    const body = mapInscripcionToBackend(inscripcion);
    return this.http.put<any>(`${this.apiUrl}/inscripciones/editar/${inscripcion.id}`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/inscripciones/eliminar/${id}`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }
}
