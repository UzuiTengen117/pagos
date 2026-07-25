import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Precio } from '../models/precio.model';
import { environment } from '../../environments/environment';
import { mapPrecioFromBackend, mapPrecioToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class PreciosService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private precios = signal<Precio[]>([]);

  loadAll(): Observable<Precio[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tipos-pago`).pipe(
      map(data => data.map(mapPrecioFromBackend)),
      map(data => {
        this.precios.set(data);
        return data;
      })
    );
  }

  getAll(): Precio[] {
    return this.precios();
  }

  create(precio: Omit<Precio, 'id'>): Observable<any> {
    const body = mapPrecioToBackend(precio);
    return this.http.post<any>(`${this.apiUrl}/tipos-pago/agregar`, body);
  }

  update(precio: Precio): Observable<any> {
    const body = mapPrecioToBackend(precio);
    return this.http.put<any>(`${this.apiUrl}/tipos-pago/editar/${precio.id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tipos-pago/eliminar/${id}`);
  }
}
