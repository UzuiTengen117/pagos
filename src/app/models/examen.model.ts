export type EstadoExamen = 'programado' | 'en_curso' | 'finalizado' | 'cancelado';

// Un examen es un evento en casi todo, menos en dos cosas: no tiene `tipo` (eso
// clasifica COMO se juega un torneo, y un examen no se juega) y su fecha se llama
// `fecha_examen` en la base. El resto de la forma se copia de `evento.model.ts`
// a proposito: divergir los dosShapes solo daria dos implementaciones que
// divergen, y un examen se administra exactamente igual que un torneo.
export interface Examen {
  id: number;
  nombre: string;
  // Cintas o grados que se examinan, separados por comas. Texto libre y no un
  // catalogo cerrado porque la academia abre niveles nuevos cada temporada.
  niveles: string;
  // ISO con zona horaria. El reloj regresivo se calcula contra este instante.
  fechaExamen: string;
  sede: string;
  lugar: string;
  descripcion: string;
  precioInscripcion: number;
  cupoMaximo: number | null;
  imagen: string;
  // Si el admin ya subio la hoja de inscripcion en PDF. Es un booleano, no el
  // PDF: el archivo se pide aparte con GET /examenes/:id/hoja porque son varios
  // MB y mandarlo en cada listado reventaria la respuesta.
  tieneHoja: boolean;
  estado: EstadoExamen;
  inscritos: number;
  // Id de la inscripcion propia, o null si el alumno no va. Lo resuelve el
  // backend en el mismo SELECT del listado.
  miInscripcion: number | null;
  createdAt: string;
  updatedAt: string;
}

// Fila de la hoja de resultados de un examen. Nombres, grado y escuela vienen
// del SNAPSHOT que el alumno capturo al inscribirse, no de su perfil: si despues
// actualiza su escuela, esta lista debe seguir mostrando lo que mando para ESE
// examen.
export interface ExamenInscrito {
  id: number;
  estado: string;
  createdAt: string;
  alumnoId: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  edad: number | null;
  grado: string;
  escuela: string;
  // El resto de la hoja. Se declara con `?` porque el SELECT de inscritos se
  // pidio antes de que existieran estas columnas: una fila vieja, o un backend
  // al que todavia no se le corrio la migracion, llega sin ellas y el formulario
  // tiene que poder pintarse igual en vez de romperse con un undefined.
  numeroExamen?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  fechaNacimiento?: string | null;
  fechaIngreso?: string | null;
  gradoAPasar?: string | null;
  fechaExamenAnterior?: string | null;
  fechaUltimoTorneo?: string | null;
  fechaSolicitud?: string | null;
  profesorAutoriza?: string | null;
  firmaSolicitante?: string | null;
  firmaPadre?: string | null;
  recordAsistencia?: number | null;
  calBasicos?: number | null;
  calRompimientos?: number | null;
  calPateo?: number | null;
  calCombateLibre?: number | null;
  calFormas?: number | null;
  calDefensaPersonal?: number | null;
  notaCombateUnPaso?: string | null;
  notaPateoSaltando?: string | null;
  comentarios?: string | null;
  aprobado?: boolean | null;
  firmaExaminador?: string | null;
  calificadoAt?: string | null;
}

// El cuerpo del modal de inscripcion es IDENTICO al de un evento: los mismos
// seis campos, con la misma validacion y el mismo snapshot. Se reexporta el tipo
// en vez de duplicarlo para que no puedan divergir: si un dia el examen pide un
// campo mas, se cambia en un solo lugar.
// `export type` y no `export`: el proyecto compila con `isolatedModules`, que
// no sabe distinguir un tipo de un valor al reexportar y obliga a declararlo.
export type { DatosInscripcion } from './evento.model';

// ── Hoja "SOLICITUD DE EXAMEN" ──────────────────────────────────────────────
//
// La hoja que se entrega en el examen tiene dos mitades y aqui estan separadas
// por el mismo motivo que en la base: la primera la llena el alumno al
// inscribirse y la segunda la institucion despues. Juntas en un solo tipo, el
// formulario del alumno terminaria ofreciendo campos que no le tocan.
//
// `SolicitudExamen` NO extiende `DatosInscripcion` aunque comparta cinco campos
// con el: extenderse arrastraria los que sobran (`escuela` ya se fuerza en el
// backend) y las dos mitades dejarian de ser independientes.

// Bloque del alumno. Los seis campos de identidad NO se repiten aqui: ya estan en
// `DatosInscripcion` y se siguen mandando en el mismo request.
export interface SolicitudExamen {
  numeroExamen: string;
  direccion: string;
  telefono: string;
  fechaNacimiento: string;
  fechaIngreso: string;
  gradoAPasar: string;
  fechaExamenAnterior: string;
  fechaUltimoTorneo: string;
  fechaSolicitud: string;
  profesorAutoriza: string;
  // Data URL completa, tal cual sale del canvas. El backend valida el prefijo y
  // guarda solo el payload; al leer hay que volver a anteponer `data:image/png;base64,`.
  firmaSolicitante: string;
  firmaPadre: string;
}

// Bloque "PARA USO EXCLUSIVO DE LA INSTITUCION".
//
// `aprobado` es `boolean | null` y eso NO es descuido: null = el examen todavia no
// se califico, true = aprobado, false = reprobado. Con `boolean` a secas no se
// puede distinguir el tercero y todo alumno recien inscrito saldia reprobado en
// cualquier reporte.
export interface CalificacionExamen {
  recordAsistencia: number | null;
  calBasicos: number | null;
  calRompimientos: number | null;
  calPateo: number | null;
  calCombateLibre: number | null;
  calFormas: number | null;
  calDefensaPersonal: number | null;
  notaCombateUnPaso: string;
  notaPateoSaltando: string;
  comentarios: string;
  aprobado: boolean | null;
  firmaExaminador: string;
}

export interface ExamenFormData {
  nombre: string;
  estado: EstadoExamen;
  fechaExamenLocal: string;
  sede: string;
  lugar: string;
  niveles: string;
  descripcion: string;
  precioInscripcion: number;
  cupoMaximo: number | null;
}
