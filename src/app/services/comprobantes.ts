import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { Comprobante } from '../models/comprobante.model';
import { environment } from '../../environments/environment';
import { mapComprobanteFromBackend, mapComprobanteToBackend } from '../utils/mappers';

const FECHAS_KEY = 'comprobantes_fechas_override';

@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private comprobantes = signal<Comprobante[]>([]);

  loadAll(): Observable<Comprobante[]> {
    return this.http.get<any[]>(`${this.apiUrl}/comprobantes`).pipe(
      map(data => data.map(mapComprobanteFromBackend)),
      map(data => {
        const overrides = this.loadFechaOverrides();
        data.forEach(c => {
          if (overrides[c.id]) {
            c.fechaEmision = new Date(overrides[c.id]);
          }
        });
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

  updateFecha(id: number, fecha: Date): Observable<any> {
    this.saveFechaOverride(id, fecha);
    const comprobante = this.comprobantes().find(c => c.id === id);
    if (comprobante) {
      comprobante.fechaEmision = fecha;
      this.comprobantes.set([...this.comprobantes()]);
    }
    return of({ success: true });
  }

  cancelar(id: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/comprobantes/editar/${id}`, {
      observaciones: 'Cancelado',
    });
  }

  delete(id: number): Observable<any> {
    this.removeFechaOverride(id);
    return this.http.delete<any>(`${this.apiUrl}/comprobantes/eliminar/${id}`);
  }

  private loadFechaOverrides(): Record<number, string> {
    try {
      return JSON.parse(localStorage.getItem(FECHAS_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private saveFechaOverride(id: number, fecha: Date): void {
    const overrides = this.loadFechaOverrides();
    overrides[id] = fecha.toISOString();
    localStorage.setItem(FECHAS_KEY, JSON.stringify(overrides));
  }

  private removeFechaOverride(id: number): void {
    const overrides = this.loadFechaOverrides();
    delete overrides[id];
    localStorage.setItem(FECHAS_KEY, JSON.stringify(overrides));
  }
}
