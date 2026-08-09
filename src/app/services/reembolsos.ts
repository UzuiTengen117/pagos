import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { SolicitudReembolso } from '../models/reembolso.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import { mapReembolsoFromBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class ReembolsosService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
  private apiUrl = environment.apiUrl;
  private solicitudes = signal<SolicitudReembolso[]>([]);

  loadAll(): Observable<SolicitudReembolso[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reembolsos`).pipe(
      map(data => data.map(mapReembolsoFromBackend)),
      tap(data => this.solicitudes.set(data))
    );
  }

  loadPendientes(): Observable<SolicitudReembolso[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reembolsos/pendientes`).pipe(
      map(data => data.map(mapReembolsoFromBackend))
    );
  }

  loadHistorial(): Observable<SolicitudReembolso[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reembolsos/historial`).pipe(
      map(data => data.map(mapReembolsoFromBackend))
    );
  }

  getAll(): SolicitudReembolso[] {
    return this.solicitudes();
  }

  create(payload: { comprobante_id: number; pago_id?: number; monto?: number; motivo: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reembolsos`, payload).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  editar(id: number, motivo: string, monto?: number): Observable<any> {
    const body: any = { motivo };
    if (monto !== undefined && monto !== null) {
      body.monto = monto;
    }
    return this.http.put<any>(`${this.apiUrl}/reembolsos/editar/${id}`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  aprobar(id: number, motivo: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reembolsos/${id}/aprobar`, { motivo }).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  rechazar(id: number, motivo: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reembolsos/${id}/rechazar`, { motivo_rechazo: motivo }).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  reabrir(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reembolsos/${id}/reabrir`, {}).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/reembolsos/eliminar/${id}`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }
}
