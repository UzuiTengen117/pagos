import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Evento, EventoFormData, EventoInscrito, DatosInscripcion } from '../models/evento.model';
import { RefreshService } from './refresh';
import { environment } from '../../environments/environment';
import {
  mapEventoFromBackend,
  mapInscritoFromBackend,
  mapEventoToBackend,
  mapDatosInscripcionToBackend,
} from '../utils/mappers';

export const TIPOS_EVENTO: { valor: Evento['tipo']; etiqueta: string }[] = [
  { valor: 'torneo', etiqueta: 'Torneo' },
  { valor: 'dual_meet', etiqueta: 'Dual Meet' },
  { valor: 'open', etiqueta: 'Open' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const ESTADOS_EVENTO: { valor: Evento['estado']; etiqueta: string }[] = [
  { valor: 'programado', etiqueta: 'Programado' },
  { valor: 'en_curso', etiqueta: 'En curso' },
  { valor: 'finalizado', etiqueta: 'Finalizado' },
  { valor: 'cancelado', etiqueta: 'Cancelado' },
];

// Las sedes donde se puede celebrar un torneo. Lista cerrada por las tres capas:
// el <select> del formulario, la validacion del backend (`src/config/sedes.js`,
// que es la fuente de verdad) y el CHECK de la columna. Los tres copian estos
// mismos dos valores porque el frontend no puede importar del backend; si se
// agrega una sede hay que tocarlos en ese orden.
export const SEDES_EVENTO = ['Progreso', 'Morelos'];

const IMAGENES_PERMITIDAS = ['image/jpeg', 'image/png', 'image/webp'];
// Mismo techo que aplica multer en el backend. Validarlo aqui evita gastar el
// upload entero en una imagen que el servidor va a rechazar.
const TAMANO_MAXIMO = 2 * 1024 * 1024;

@Injectable({ providedIn: 'root' })
export class EventosService {
  private http = inject(HttpClient);
  private refreshService = inject(RefreshService);
  private apiUrl = environment.apiUrl;

  private eventos = signal<Evento[]>([]);

  loadAll(): Observable<Evento[]> {
    return this.http.get<any[]>(`${this.apiUrl}/eventos`).pipe(
      map(data => data.map(mapEventoFromBackend)),
      map(data => {
        this.eventos.set(data);
        return data;
      })
    );
  }

  getAll(): Evento[] {
    return this.eventos();
  }

  create(form: EventoFormData): Observable<Evento> {
    return this.http.post<any>(`${this.apiUrl}/eventos/agregar`, mapEventoToBackend(form)).pipe(
      map(mapEventoFromBackend),
      tap(() => this.refreshService.refresh())
    );
  }

  update(id: number, form: EventoFormData): Observable<Evento> {
    return this.http.put<any>(`${this.apiUrl}/eventos/editar/${id}`, mapEventoToBackend(form)).pipe(
      map(mapEventoFromBackend),
      tap(() => this.refreshService.refresh())
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eventos/eliminar/${id}`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // La imagen viaja sola en un FormData multipart: meterla en el PUT del evento
  // la haria pasar por el limite de 1mb de express.json y obligaria a reenviar
  // todos los campos en cada cambio de foto.
  //
  // Se mandan dos archivos. El thumbnail (~40KB) es el que pide el listado; la
  // original se guarda completa pero solo se lee al abrir un evento. Sin esa
  // division, dos eventos con cartel de 2MB ya superan el limite de 4.5MB de
  // respuesta de Vercel y la pagina del alumno deja de cargar.
  subirImagen(id: number, archivo: File, thumbnail?: File): Observable<{ imagen: string }> {
    const form = new FormData();
    form.append('imagen', archivo);
    if (thumbnail) {
      form.append('imagen_thumb', thumbnail);
    }
    return this.http.post<any>(`${this.apiUrl}/eventos/${id}/imagen`, form).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // Sin esto "Quitar" en el formulario solo limpiaba la vista previa y el cartel
  // viejo seguia vivo para los alumnos.
  eliminarImagen(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eventos/${id}/imagen`).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  // Corregir los datos de una inscripcion. El snapshot sigue siendo del alumno
  // (la lista de ese torneo no cambia), lo que cambia es que ahora esta completo
  // y es correcto. Es la unica via para llenar una edad o escuela que quedo
  // vacia en una inscripcion anterior al formulario.
  editarInscrito(eventoId: number, inscripcionId: number, datos: DatosInscripcion): Observable<EventoInscrito> {
    return this.http
      .patch<any>(`${this.apiUrl}/eventos/${eventoId}/inscritos/${inscripcionId}`, mapDatosInscripcionToBackend(datos))
      .pipe(map(mapInscritoFromBackend));
  }

  loadInscritos(id: number): Observable<EventoInscrito[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/eventos/${id}/inscritos`)
      .pipe(map(data => data.map(mapInscritoFromBackend)));
  }

  // El alumno decide su propia participacion: el backend resuelve el alumno_id
  // desde el token, asi que aqui no viaja ningun id. Lo que si viaja son los
  // datos que escribio en el modal (nombre, apellidos, edad, grado, escuela), que
  // quedan congelados como snapshot de esta inscripcion.
  inscribirse(id: number, datos: DatosInscripcion): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/eventos/${id}/inscribirse`, mapDatosInscripcionToBackend(datos)).pipe(
      tap(() => this.refreshService.refresh())
    );
  }

  cancelarInscripcion(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eventos/${id}/inscribirse`).pipe(
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
}
