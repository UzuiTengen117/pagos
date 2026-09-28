export type TipoEvento = 'torneo' | 'dual_meet' | 'open' | 'otro';

export type EstadoEvento = 'programado' | 'en_curso' | 'finalizado' | 'cancelado';

export interface Evento {
  id: number;
  nombre: string;
  tipo: TipoEvento;
  // ISO con zona horaria. El reloj regresivo se calcula contra este instante.
  fechaInicio: string;
  sede: string;
  lugar: string;
  categorias: string;
  descripcion: string;
  precioInscripcion: number;
  cupoMaximo: number | null;
  imagen: string;
  estado: EstadoEvento;
  inscritos: number;
  // Id de la inscripcion propia, o null si el usuario no va. Lo resuelve el
  // backend en el mismo SELECT del listado para no pedir un request por tarjeta.
  miInscripcion: number | null;
  createdAt: string;
  updatedAt: string;
}

// Fila de la lista de inscritos de un evento. Los nombres, el grado y la
// escuela vienen del SNAPSHOT que el alumno capturo al inscribirse, no de su
// perfil en `alumnos`: si despues actualiza su escuela, esta lista debe seguir
// mostrando lo que mando para ESE torneo.
export interface EventoInscrito {
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

// Lo que el alumno responde en el modal antes de inscribirse. Los cuatro
// campos de identidad y grado ya existen en su perfil y llegan precargados; edad
// y escuela no estan ahi y se piden de cero.
export interface DatosInscripcion {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  edad: number | null;
  grado: string;
  escuela: string;
}

// El formulario maneja la fecha como texto de <input type="datetime-local">
// ("2026-10-15T13:00") porque es hora local del usuario, no un instante. La
// conversion a ISO ocurre en el mapper al enviar.
export interface EventoFormData {
  nombre: string;
  tipo: TipoEvento;
  estado: EstadoEvento;
  fechaInicioLocal: string;
  sede: string;
  lugar: string;
  categorias: string;
  descripcion: string;
  precioInscripcion: number;
  cupoMaximo: number | null;
}

export interface CuentaRegresiva {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  totalMs: number;
  terminado: boolean;
}
