import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, of } from 'rxjs';
import { Alumno } from '../models/alumno.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import { mapAlumnoFromBackend, mapAlumnoToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class AlumnosService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
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

  // Ficha del alumno que tiene la sesion iniciada. El backend la resuelve por
  // el usuario_id del JWT, asi que no viaja ningun id y no se puede pedir la de
  // otro. Se usa para precargar el formulario de inscripcion a un torneo: pedirle
  // al alumno que escriba su nombre cada vez es pedirle que lo escriba mal.
  //
  // Se cachea en `perfil` para no repetir el GET cada vez que se abre el modal.
  private perfil = signal<Alumno | null>(null);

  getMiPerfil(): Observable<Alumno> {
    if (this.perfil()) {
      return of(this.perfil() as Alumno);
    }
    return this.http.get<any>(`${this.apiUrl}/alumnos/mi-perfil`).pipe(
      map(data => mapAlumnoFromBackend(data)),
      tap(alumno => this.perfil.set(alumno))
    );
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
    return this.http.post<any>(`${this.apiUrl}/alumnos/agregar`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  update(alumno: Alumno): Observable<any> {
    const body = mapAlumnoToBackend(alumno);
    return this.http.put<any>(`${this.apiUrl}/alumnos/editar/${alumno.id}`, body).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/alumnos/eliminar/${id}`).pipe(
      tap(() => {
        this.alumnos.set(this.alumnos().filter(a => a.id !== id));
        this.refreshService.refresh();
      })
    );
  }
}
