import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Alumno } from '../models/alumno.model';
import { environment } from '../../environments/environment';
import { mapAlumnoFromBackend, mapAlumnoToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class AlumnosService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private alumnos = signal<Alumno[]>([]);

  loadAll(): Observable<Alumno[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos`).pipe(
      map(data => data.map(mapAlumnoFromBackend)),
      map(data => {
        this.alumnos.set(data);
        return data;
      })
    );
  }

  getAll(): Alumno[] {
    return this.alumnos();
  }

  getDisponibles(): Observable<Alumno[]> {
    return this.http.get<any[]>(`${this.apiUrl}/alumnos/disponibles`).pipe(
      map(data => data.map(mapAlumnoFromBackend))
    );
  }

  getById(id: number): Alumno | undefined {
    return this.alumnos().find(a => a.id === id);
  }

  getBecados50(): Alumno[] {
    return this.alumnos().filter(a => a.beca === 50);
  }

  getBecados100(): Alumno[] {
    return this.alumnos().filter(a => a.beca === 100);
  }

  create(alumno: Omit<Alumno, 'id'>): Observable<any> {
    const body = mapAlumnoToBackend(alumno);
    return this.http.post<any>(`${this.apiUrl}/alumnos/agregar`, body);
  }

  update(alumno: Alumno): Observable<any> {
    const body = mapAlumnoToBackend(alumno);
    return this.http.put<any>(`${this.apiUrl}/alumnos/editar/${alumno.id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/alumnos/eliminar/${id}`);
  }
}
