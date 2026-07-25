import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Comprobante } from '../models/comprobante.model';
import { environment } from '../../environments/environment';
import { mapComprobanteFromBackend, mapComprobanteToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private comprobantes = signal<Comprobante[]>([]);

  loadAll(): Observable<Comprobante[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comprobantes`).pipe(
      map(data => data.map(mapComprobanteFromBackend)),
      map(data => {
        this.comprobantes.set(data);
        return data;
      })
    );
  }

  getAll(): Comprobante[] {
    return this.comprobantes();
  }

  getById(id: number): Comprobante | undefined {
    return this.comprobantes().find(c => c.id === id);
  }

  filtrarPorNombre(nombre: string): Comprobante[] {
    if (!nombre) return this.comprobantes();
    return this.comprobantes().filter(c =>
      c.alumnoNombre.toLowerCase().includes(nombre.toLowerCase())
    );
  }

  filtrarPorFechas(fechaInicio: Date, fechaFin: Date): Comprobante[] {
    return this.comprobantes().filter(c => {
      const fecha = new Date(c.fechaEmision);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });
  }

  generarFolio(): string {
    const year = new Date().getFullYear();
    const num = String(this.comprobantes().length + 1).padStart(3, '0');
    return `COMP-${year}-${num}`;
  }

  create(comprobante: Omit<Comprobante, 'id' | 'folio' | 'fechaEmision'>): Observable<any> {
    const body = mapComprobanteToBackend(comprobante);
    return this.http.post<any>(`${this.apiUrl}/comprobantes/agregar`, body);
  }

  cancelar(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/comprobantes/editar/${id}`, {
      observaciones: 'Cancelado',
    });
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/comprobantes/eliminar/${id}`);
  }
}
