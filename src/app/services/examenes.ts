import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Examen, ExamenFormData, ExamenInscrito, DatosInscripcion } from '../models/examen.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import {
  mapExamenFromBackend,
  mapExamenToBackend,
  mapInscritoFromBackend,
  mapDatosInscripcionToBackend,
} from '../utils/mappers';

export const ESTADOS_EXAMEN: { valor: Examen['estado']; etiqueta: string }[] = [
  { valor: 'programado', etiqueta: 'Programado' },
  { valor: 'en_curso', etiqueta: 'En curso' },
  { valor: 'finalizado', etiqueta: 'Finalizado' },
  { valor: 'cancelado', etiqueta: 'Cancelado' },
];

// Mismos dos valores que SEDES_EVENTO y que el backend valida en
// `src/config/sedes.js`. El frontend no puede importar del backend, asi que los
// tres copian la misma lista; si se agrega una sede hay que tocarlos en ese orden.
export const SEDES_EXAMEN = ['Progreso', 'Morelos'];

// Cintas de la academia, en orden de promocion. Es la escala WTF, no la ITF de
// compilacion: blanca, amarilla, naranja, verde, marron, roja, negra.
//
// Copia de la lista que vive en `components/eventos/eventos/eventos.ts`, que es
// local ahi a proposito. Vive aqui tambien porque el filtro de examenes la
// necesita y no merece la pena mover el archivo entero de Eventos por eso. Si la
// academia abre una cinta nueva hay que tocarla en los dos lados, igual que
// SEDES. NO es lista cerrada: el campo de texto acepta cualquier nivel.
export const CINTAS = ['Blanca', 'Naranja', 'Amarilla', 'Verde', 'Marrón', 'Roja', 'Negra'];

const IMAGENES_PERMITIDAS = ['image/jpeg', 'image/png', 'image/webp'];
// Mismo techo que aplica multer en el backend. Validarlo aqui evita gastar el
// upload entero en una imagen que el servidor va a rechazar.
const TAMANO_MAXIMO = 2 * 1024 * 1024;

// Techo de la hoja de inscripcion. Tiene que coincidir con HOJA_MAX_BYTES en
// back-end_pagos/src/routes/examenes.js.
const TAMANO_HOJA_MAXIMO = 5 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class ExamenesService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
  private apiUrl = environment.apiUrl;

  private examenes = signal<Examen[]>([]);

  loadAll(): Observable<Examen[]> {
    return this.http.get<any[]>(`${this.apiUrl}/examenes`).pipe(
      map(data => data.map(mapExamenFromBackend)),
      map(data => {
        this.examenes.set(data);
        return data;
      })
    );
  }

  getAll(): Examen[] {
    return this.examenes();
  }

  create(form: ExamenFormData): Observable<Examen> {
    return this.http.post<any>(`${this.apiUrl}/examenes/agregar`, mapExamenToBackend(form)).pipe(
      map(mapExamenFromBackend),
      tap(() => this.refreshService.refresh())
    );
  }

  update(id: number, form: ExamenFormData): Observable<Examen> {
    return this.http.put<any>(`${this.apiUrl}/examenes/editar/${id}`, mapExamenToBackend(form)).pipe(
      map(mapExamenFromBackend),
      tap(() => this.refreshService.refresh())
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/examenes/eliminar/${id}`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // La imagen viaja sola en un FormData multipart: meterla en el PUT del examen
  // la haria pasar por el limite de 1mb de express.json y obligaria a reenviar
  // todos los campos en cada cambio de foto.
  //
  // Se mandan dos archivos. El thumbnail (~40KB) es el que pide el listado; la
  // original se guarda completa pero solo se lee al abrir un examen. Sin esa
  // division, dos examenes con cartel de 2MB ya superan el limite de 4.5MB de
  // respuesta de Vercel y la pagina del alumno deja de cargar.
  subirImagen(id: number, archivo: File, thumbnail?: File): Observable<{ imagen: string }> {
    const form = new FormData();
    form.append('imagen', archivo);
    if (thumbnail) {
      form.append('imagen_thumb', thumbnail);
    }
    return this.http.post<any>(`${this.apiUrl}/examenes/${id}/imagen`, form).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // Sin esto "Quitar" en el formulario solo limpiaba la vista previa y el cartel
  // viejo seguia vivo para los alumnos.
  eliminarImagen(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/examenes/${id}/imagen`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // ── Hoja de inscripcion (PDF) ────────────────────────────────────────────
  // El admin sube un PDF por examen y todo alumno inscrito baja ese mismo
  // archivo. Va en su propia ruta y no dentro del PUT, por el mismo motivo que
  // la imagen: un PDF pesa varios MB y no tiene sentido reenviarlo en cada
  // guardado de texto.

  subirHoja(id: number, archivo: File): Observable<any> {
    const form = new FormData();
    form.append('hoja', archivo);
    return this.http.post<any>(`${this.apiUrl}/examenes/${id}/hoja`, form).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  eliminarHoja(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/examenes/${id}/hoja`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // Devuelve el PDF como Blob. La respuesta va completa (`observe: 'response'`)
  // y no solo el cuerpo porque el nombre del archivo viaja en la cabecera
  // Content-Disposition, y es el unico lugar donde el backend puede sanitizarlo
  // sin que el navegador lo reescriba.
  descargarHoja(id: number): Observable<{ blob: Blob; nombreArchivo: string }> {
    return this.http
      .get(`${this.apiUrl}/examenes/${id}/hoja`, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((resp) => ({
          blob: resp.body as Blob,
          nombreArchivo: this.nombreDesdeCabecera(resp.headers.get('Content-Disposition')),
        }))
      );
  }

  // El backend manda filename="hoja-inscripcion-torneo-de-verano.pdf". Se saca
  // solo el nombre, sin el prefijo attachment ni las comillas. Si la cabecera
  // no viene o viene en una forma que no se reconoce, se cae a un nombre fijo
  // en vez de dejar que el navegador invente "download".
  private nombreDesdeCabecera(cabecera: string | null): string {
    const coincidencia = cabecera?.match(/filename="([^"]+)"/);
    return coincidencia?.[1] || 'hoja-inscripcion.pdf';
  }

  // Corregir los datos de una inscripcion. El snapshot sigue siendo del alumno
  // (la hoja de resultados no cambia), lo que cambia es que ahora esta completo
  // y es correcto.
  editarInscrito(examenId: number, inscripcionId: number, datos: DatosInscripcion): Observable<ExamenInscrito> {
    return this.http
      .patch<any>(`${this.apiUrl}/examenes/${examenId}/inscritos/${inscripcionId}`, mapDatosInscripcionToBackend(datos))
      .pipe(map(mapInscritoFromBackend));
  }

  loadInscritos(id: number): Observable<ExamenInscrito[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/examenes/${id}/inscritos`)
      .pipe(map(data => data.map(mapInscritoFromBackend)));
  }

  // El alumno decide su propia participacion: el backend resuelve el alumno_id
  // desde el token, asi que aqui no viaja ningun id. Lo que si viaja son los
  // datos que escribio en el modal, que quedan congelados como snapshot.
  inscribirse(id: number, datos: DatosInscripcion): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/examenes/${id}/inscribirse`, mapDatosInscripcionToBackend(datos)).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  cancelarInscripcion(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/examenes/${id}/inscribirse`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // Devuelve el motivo del rechazo o null si la imagen sirve. La validacion
  // vive en el servicio para que los dos componentes que suben imagen no la
  // repitan.
  validarImagen(archivo: File): string | null {
    if (!IMAGENES_PERMITIDAS.includes(archivo.type)) {
      return 'Formato no válido. Solo se permiten JPG, PNG y WEBP';
    }
    if (archivo.size > TAMANO_MAXIMO) {
      return 'La imagen supera el límite de 2MB';
    }
    return null;
  }

  // El techo de 5MB es el mismo que aplica el backend, no uno inventado acá: si
  // difieren, el usuario sube un archivo que el navegador acepta y el servidor
  // rebota, que es la peor forma de descubrir un limite.
  validarHoja(archivo: File): string | null {
    if (archivo.type !== 'application/pdf') {
      return 'Formato no válido. Solo se permiten archivos PDF';
    }
    if (archivo.size > TAMANO_HOJA_MAXIMO) {
      return 'El PDF supera el límite de 5MB';
    }
    return null;
  }
}
