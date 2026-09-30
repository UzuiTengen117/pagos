import { Examen } from './examen.model';
import { Evento } from './evento.model';

// Lo que el modal de aviso necesita saber, con los nombres puestos de forma
// neutra. Existe para que el mismo modal pueda anunciar un torneo y un examen
// sin conocer los dos modelos.
//
// Se normaliza en vez de duplicar el componente: Evento tiene `tipo`,
// `categorias` y `fechaInicio`, y Examen tiene `niveles` y `fechaExamen`. Dos
// componentes identicos con tres campos cambiados de nombre divergen en la
// primera correccion, y el aviso del alumno deja de ser el mismo aviso.
export interface Aviso {
  id: number;
  nombre: string;
  imagen: string;
  // ISO. La fecha del examen o la del torneo, indistinto para el modal.
  fecha: string;
  lugar: string;
  sede: string;
  // "Cintas" en un examen, "categorías" en un torneo. El modal lo rotula
  // distinto segun el tipo, asi que el texto neutral va aparte del rotulo.
  detalle: string;
  // Que rotulo usar para ese campo: "Cintas" o "Categorías".
  rotuloDetalle: string;
  // Lo que va en la pastilla de arriba: "Torneo", "Programado"...
  etiqueta: string;
  descripcion: string;
  inscritos: number;
  cupoMaximo: number | null;
  // Estado CRUD, separado de `etiqueta`. El modal FILTRA por `estado` y MUESTRA
  // `etiqueta`: filtrar por la etiqueta ataria la regla a la palabra con la que
  // este rotulada hoy, y un examen rotulado "Programado" con mayuscula dejaria
  // de avisar.
  estado: string;
  // Id de la inscripcion propia, o null si el alumno no va.
  miInscripcion: number | null;
  // A donde lleva el boton: /alumno/eventos o /alumno/examenes.
  ruta: string;
  // Como se llama la cosa en el texto: "evento" o "examen". El plural del
  // aviso de "y N mas" sale de aqui.
  sustantivo: string;
}

// La regla de "que amerita un aviso" es la misma para torneos y examenes, asi que
// vive aqui y no duplicada en el modal. La necesita el modal para saber cual
// mostrar, y tambien el padre, que tiene que decidir el ORDEN en que se
// enseñan los dos: si solo el modal filtrara, el padre no podria distinguir
// "no hay nada que avisar" de "todavia no me ha llegado la lista", que son
// decisiones opuestas.
export function avisosDisponibles(avisos: Aviso[]): Aviso[] {
  return avisos
    .filter(a => a.estado === 'programado')
    .filter(a => a.miInscripcion === null)
    .filter(a => {
      const t = new Date(a.fecha).getTime();
      return !isNaN(t) && t > Date.now();
    })
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

export function eventoAAviso(e: Evento): Aviso {
  return {
    id: e.id,
    nombre: e.nombre,
    imagen: e.imagen,
    fecha: e.fechaInicio,
    lugar: e.lugar,
    sede: e.sede,
    detalle: e.categorias,
    rotuloDetalle: 'Categorías',
    etiqueta: e.tipo === 'dual_meet' ? 'Dual Meet' : e.tipo,
    descripcion: e.descripcion,
    inscritos: e.inscritos,
    cupoMaximo: e.cupoMaximo,
    estado: e.estado,
    miInscripcion: e.miInscripcion,
    ruta: '/alumno/eventos',
    sustantivo: 'evento',
  };
}

export function examenAAviso(e: Examen): Aviso {
  return {
    id: e.id,
    nombre: e.nombre,
    imagen: e.imagen,
    fecha: e.fechaExamen,
    lugar: e.lugar,
    sede: e.sede,
    detalle: e.niveles,
    rotuloDetalle: 'Cintas',
    // Un examen no tiene `tipo`, asi que la pastilla dice el estado, que es lo
    // que el alumno necesita decidir: si sigue abierto o ya paso.
    etiqueta: e.estado,    descripcion: e.descripcion,
    inscritos: e.inscritos,
    cupoMaximo: e.cupoMaximo,
    estado: e.estado,
    miInscripcion: e.miInscripcion,
    ruta: '/alumno/examenes',
    sustantivo: 'examen',
  };
}
