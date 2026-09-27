import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  MiQr,
  MiAsistencia,
  SesionClase,
  AlumnoEnSesion,
  ResultadoRegistro,
} from '../models/asistencia.model';
import {
  mapMiQrAlumnoFromBackend,
  mapMiAsistenciaFromBackend,
  mapSesionFromBackend,
  mapAlumnoEnSesionFromBackend,
  mapResultadoRegistroFromBackend,
} from '../utils/mappers';

const SEDES = ['Progreso', 'Morelos'];

@Injectable({ providedIn: 'root' })
export class AsistenciasService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private misAsistencias = signal<MiAsistencia[]>([]);
  private alumnosSesion = signal<AlumnoEnSesion[]>([]);

  getMisAsistenciasSignal() {
    return this.misAsistencias;
  }

  getAlumnosSesionSignal() {
    return this.alumnosSesion;
  }

  getMiQr(): Observable<MiQr> {
    return this.http.get<any>(`${this.apiUrl}/asistencias/mi-qr`).pipe(
      map(data => ({ token: data.token, alumno: mapMiQrAlumnoFromBackend(data.alumno) }))
    );
  }

  loadMisAsistencias(): Observable<MiAsistencia[]> {
    return this.http.get<any[]>(`${this.apiUrl}/asistencias/mis-asistencias`).pipe(
      map(data => data.map(mapMiAsistenciaFromBackend)),
      map(data => {
        this.misAsistencias.set(data);
        return data;
      })
    );
  }

  abrirSesion(grado: string, sede: string): Observable<SesionClase> {
    return this.http.post<any>(`${this.apiUrl}/asistencias/abrir-sesion`, { grado, sede }).pipe(
      map(mapSesionFromBackend)
    );
  }

  cerrarSesion(id: number): Observable<SesionClase> {
    return this.http.post<any>(`${this.apiUrl}/asistencias/cerrar-sesion/${id}`, {}).pipe(
      map(mapSesionFromBackend)
    );
  }

  getSesionActual(): Observable<SesionClase | null> {
    return this.http.get<any>(`${this.apiUrl}/asistencias/sesion-actual`).pipe(
      map(data => (data ? mapSesionFromBackend(data) : null)),
      catchError(() => of(null))
    );
  }

  getSesiones(): Observable<SesionClase[]> {
    return this.http.get<any[]>(`${this.apiUrl}/asistencias/sesiones`).pipe(
      map(data => data.map(mapSesionFromBackend))
    );
  }

  loadAlumnosSesion(sesionId: number): Observable<AlumnoEnSesion[]> {
    return this.http.get<any[]>(`${this.apiUrl}/asistencias/sesion/${sesionId}/alumnos`).pipe(
      map(data => data.map(mapAlumnoEnSesionFromBackend)),
      map(data => {
        this.alumnosSesion.set(data);
        return data;
      })
    );
  }

  registrarPorQr(token: string, sesionId: number): Observable<ResultadoRegistro> {
    return this.http.post<any>(`${this.apiUrl}/asistencias/registrar`, { token, sesion_id: sesionId }).pipe(
      map(mapResultadoRegistroFromBackend)
    );
  }

  registrarManual(alumnoId: number, sesionId: number): Observable<ResultadoRegistro> {
    return this.http.post<any>(`${this.apiUrl}/asistencias/registrar`, {
      alumno_id: alumnoId,
      sesion_id: sesionId,
    }).pipe(map(mapResultadoRegistroFromBackend));
  }

  eliminarRegistro(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/asistencias/${id}`);
  }

  // Elimina la clase completa del reporte; el backend arrastra sus
  // asistencias por cascada. Solo administradores.
  deleteSesion(id: number): Observable<{ message: string; asistencias_eliminadas: number }> {
    return this.http.delete<any>(`${this.apiUrl}/asistencias/sesiones/${id}`);
  }

  getSedes(): string[] {
    return SEDES;
  }
}
