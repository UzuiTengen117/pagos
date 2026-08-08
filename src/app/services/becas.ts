import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Beca } from '../models/beca.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import { mapBecaFromBackend, mapBecaToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class BecasService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
  private apiUrl = environment.apiUrl;

  loadAll(): Observable<Beca[]> {
    return this.http.get<any[]>(`${this.apiUrl}/becas`).pipe(
      map(data => data.map(mapBecaFromBackend))
    );
  }

  create(beca: Omit<Beca, 'id'>): Observable<any> {
    const body = mapBecaToBackend(beca);
    return this.http.post<any>(`${this.apiUrl}/becas/agregar`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  update(beca: Beca): Observable<any> {
    const body = mapBecaToBackend(beca);
    return this.http.put<any>(`${this.apiUrl}/becas/editar/${beca.id}`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/becas/eliminar/${id}`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }
}
