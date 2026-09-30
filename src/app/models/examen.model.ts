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
}

// El cuerpo del modal de inscripcion es IDENTICO al de un evento: los mismos
// seis campos, con la misma validacion y el mismo snapshot. Se reexporta el tipo
// en vez de duplicarlo para que no puedan divergir: si un dia el examen pide un
// campo mas, se cambia en un solo lugar.
// `export type` y no `export`: el proyecto compila con `isolatedModules`, que
// no sabe distinguir un tipo de un valor al reexportar y obliga a declararlo.
export type { DatosInscripcion } from './evento.model';

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
