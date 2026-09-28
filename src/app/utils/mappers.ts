import { Usuario, RolUsuario } from '../models/usuario.model';
import { Alumno } from '../models/alumno.model';
import { Pago } from '../models/pago.model';
import { Beca } from '../models/beca.model';
import { Precio } from '../models/precio.model';
import { Comprobante } from '../models/comprobante.model';
import { Inscripcion } from '../models/inscripcion.model';
import { SolicitudReembolso } from '../models/reembolso.model';
import { MiQrAlumno, MiAsistencia, SesionClase, AlumnoEnSesion, ResultadoRegistro } from '../models/asistencia.model';
import { Evento, EventoFormData, EventoInscrito, DatosInscripcion } from '../models/evento.model';

export function mapRol(backendRol: string): RolUsuario {
  switch (backendRol) {
    case 'admin': return 'administrador';
    case 'profesor': return 'profesor';
    case 'estudiante': return 'estudiante';
    default: return 'estudiante';
  }
}

export function mapRolToFrontend(rol: RolUsuario): string {
  switch (rol) {
    case 'administrador': return 'admin';
    case 'profesor': return 'profesor';
    case 'estudiante': return 'estudiante';
    default: return 'estudiante';
  }
}

export function mapUsuarioFromBackend(data: any): Usuario {
  return {
    id: data.id,
    nombre: data.nombre,
    primerApellido: data.primer_apellido || '',
    segundoApellido: data.segundo_apellido || '',
    username: data.username,
    email: data.email || '',
    rol: mapRol(data.rol),
    fechaCreacion: data.created_at ? new Date(data.created_at) : new Date(),
    foto: data.foto || '',
  };
}

export function mapUsuarioToBackend(usuario: any): any {
  const body: any = {
    nombre: usuario.nombre,
    primer_apellido: usuario.primerApellido || '',
    segundo_apellido: usuario.segundoApellido || '',
    username: usuario.username,
    email: usuario.email,
    rol: mapRolToFrontend(usuario.rol),
  };
  if (usuario.foto !== undefined) {
    body.foto = usuario.foto || '';
  }
  return body;
}

export function mapAlumnoFromBackend(data: any): Alumno {
  return {
    id: data.id,
    nombre: data.nombre,
    primerApellido: data.primer_apellido || '',
    segundoApellido: data.segundo_apellido || '',
    username: data.usuario_nombre || '',
    email: data.email || '',
    telefono: data.telefono || '',
    grado: data.grado || '',
    sede: data.sede || '',
    fechaInscripcion: data.created_at ? new Date(data.created_at) : new Date(),
    beca: data.beca_porcentaje ? Number(data.beca_porcentaje) : 0,
    activo: data.activo !== false,
    usuarioId: data.usuario_id,
    becaId: data.beca_id,
  };
}

export function mapAlumnoToBackend(alumno: any): any {
  return {
    nombre: alumno.nombre,
    primer_apellido: alumno.primerApellido || '',
    segundo_apellido: alumno.segundoApellido || '',
    usuario_id: alumno.usuarioId || alumno.usuario_id,
    email: alumno.email,
    telefono: alumno.telefono || '',
    grado: alumno.grado || '',
    sede: alumno.sede || '',
    beca_id: alumno.becaId || alumno.beca_id || null,
  };
}

export function mapPagoFromBackend(data: any): Pago {
  const nombre = data.nombre || '';
  const apellido = data.primer_apellido || '';
  const segundoApellido = data.segundo_apellido || '';
  const fullName = `${nombre} ${apellido} ${segundoApellido}`.trim();

  return {
    id: data.id,
    alumnoId: data.alumno_id,
    alumnoNombre: fullName,
    monto: Number(data.monto_final),
    montoOriginal: Number(data.monto_original),
    concepto: data.concepto || '',
    fechaPago: data.created_at ? new Date(data.created_at) : new Date(),
    estado: data.estado || 'pendiente',
    semana: data.semana || 0,
    mes: data.mes || '',
    becaPorcentaje: data.beca_porcentaje ? Number(data.beca_porcentaje) : 0,
    precioId: data.tipo_pago_id,
    tipoPago: data.tipo || 'mensualidad',
    becaId: data.beca_id,
    becaNombre: data.beca_nombre || '',
    montoParcial: data.monto_parcial ? Number(data.monto_parcial) : undefined,
    notasPendiente: data.notas_pendiente || undefined,
  };
}

export function mapPagoToBackend(pago: any): any {
  return {
    alumno_id: pago.alumnoId,
    tipo_pago_id: pago.precioId,
    semana: pago.semana || null,
    mes: pago.mes,
    estado: pago.estado || 'pendiente',
    monto: pago.monto || null,
    monto_original: pago.montoOriginal || null,
    beca_porcentaje: pago.becaPorcentaje ?? null,
    monto_parcial: pago.montoParcial || null,
    notas_pendiente: pago.notasPendiente || null,
  };
}

export function mapBecaFromBackend(data: any): Beca {
  return {
    id: data.id,
    nombre: data.nombre,
    porcentaje: Number(data.porcentaje),
    descripcion: data.descripcion || '',
    activa: data.estado === 'activa',
    estado: data.estado,
  };
}

export function mapBecaToBackend(beca: any): any {
  return {
    nombre: beca.nombre,
    porcentaje: beca.porcentaje,
    estado: String(beca.activa) === 'true' ? 'activa' : 'inactiva',
    descripcion: beca.descripcion || '',
  };
}

export function mapPrecioFromBackend(data: any): Precio {
  return {
    id: data.id,
    concepto: data.concepto,
    monto: Number(data.monto),
    tipo: data.tipo,
  };
}

export function mapPrecioToBackend(precio: any): any {
  return {
    concepto: precio.concepto,
    monto: precio.monto,
    tipo: precio.tipo,
  };
}

export function mapComprobanteFromBackend(data: any): Comprobante {
  const nombre = data.nombre || '';
  const apellido = data.primer_apellido || '';
  const segundoApellido = data.segundo_apellido || '';
  const fullName = `${nombre} ${apellido} ${segundoApellido}`.trim();

  return {
    id: data.id,
    folio: data.folio || `COMP-${new Date().getFullYear()}-${String(data.id).padStart(3, '0')}`,
    pagoId: data.pago_id || 0,
    alumnoId: data.alumno_id,
    alumnoNombre: fullName,
    alumnoEmail: '',
    concepto: data.concepto || '',
    monto: Number(data.monto),
    fechaEmision: data.created_at ? new Date(data.created_at) : new Date(),
    estado: 'activo' as const,
    metodoPago: data.metodo_pago || 'efectivo',
    observaciones: data.observaciones || '',
  };
}

export function mapComprobanteToBackend(comprobante: any): any {
  return {
    alumno_id: comprobante.alumnoId,
    pago_id: comprobante.pagoId || null,
    concepto: comprobante.concepto,
    monto: comprobante.monto,
    metodo_pago: comprobante.metodoPago,
    observaciones: comprobante.observaciones || '',
  };
}

export function mapReembolsoFromBackend(data: any): SolicitudReembolso {
  const nombre = data.nombre || '';
  const apellido = data.primer_apellido || '';
  const segundoApellido = data.segundo_apellido || '';
  const fullName = `${nombre} ${apellido} ${segundoApellido}`.trim();

  return {
    id: data.id,
    alumnoId: data.alumno_id,
    alumnoNombre: fullName,
    pagoId: data.pago_id ?? null,
    comprobanteId: data.comprobante_id ?? null,
    comprobanteConcepto: data.comprobante_concepto || '',
    comprobanteMetodoPago: data.comprobante_metodo_pago || '',
    comprobanteFecha: data.comprobante_fecha ? new Date(data.comprobante_fecha) : null,
    folio: data.folio || '',
    pagoMes: data.pago_mes || '',
    monto: Number(data.monto) || 0,
    motivo: data.motivo || '',
    estado: data.estado || 'pendiente',
    motivoRechazo: data.motivo_rechazo || '',
    motivoAprobacion: data.motivo_aprobacion || '',
    revisadoPor: data.revisado_por ?? null,
    revisadoPorNombre: data.revisado_por_nombre || '',
    creadaPor: data.creada_por ?? null,
    createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    updatedAt: data.updated_at ? new Date(data.updated_at) : null,
  };
}

export function mapInscripcionFromBackend(data: any): Inscripcion {
  const alumnoObj = data.alumno || {};
  const nombre = data.nombre || (data.alumno && data.alumno.nombre) || data.alumno_nombre || '';
  const apellido = data.primer_apellido || (data.alumno && data.alumno.primer_apellido) || data.alumno_primer_apellido || '';
  const segundoApellido = data.segundo_apellido || (data.alumno && data.alumno.segundo_apellido) || data.alumno_segundo_apellido || '';
  const fullName = data.alumno_nombre_completo || `${nombre} ${apellido} ${segundoApellido}`.trim();

  return {
    id: data.id,
    alumnoId: data.alumno_id,
    alumnoNombre: fullName,
    monto: Number(data.monto_final || data.monto_inscripcion || data.monto || data.monto_total || 0),
    montoOriginal: Number(data.monto_original || data.monto_inscripcion || data.monto || data.precio_original || 0),
    becaPorcentaje: data.beca_porcentaje ? Number(data.beca_porcentaje) : 0,
    precioId: data.tipo_pago_id || data.precio_id,
    fechaInscripcion: data.fecha_inscripcion ? new Date(data.fecha_inscripcion) : new Date(),
    cicloEscolar: data.ciclo_escolar || '',
    grado: data.grado || '',
    estado: data.estado || 'pendiente',
    metodoPago: data.metodo_pago || 'efectivo',
    notas: data.notas || '',
  };
}

export function mapInscripcionToBackend(inscripcion: any): any {
  const fecha = inscripcion.fechaInscripcion instanceof Date
    ? inscripcion.fechaInscripcion.toISOString()
    : inscripcion.fechaInscripcion || new Date().toISOString();

  return {
    alumno_id: inscripcion.alumnoId,
    tipo_pago_id: inscripcion.precioId,
    fecha_inscripcion: fecha,
    ciclo_escolar: inscripcion.cicloEscolar || '',
    monto: inscripcion.monto || null,
    monto_original: inscripcion.montoOriginal || null,
    beca_porcentaje: inscripcion.becaPorcentaje ?? null,
    estado: inscripcion.estado || 'pendiente',
    metodo_pago: inscripcion.metodoPago || 'efectivo',
    notas: inscripcion.notas || '',
  };
}

export function mapMiQrAlumnoFromBackend(data: any): MiQrAlumno {
  return {
    id: data.id,
    nombre: data.nombre || '',
    primerApellido: data.primer_apellido || '',
    segundoApellido: data.segundo_apellido || '',
    username: data.username || '',
    grado: data.grado || '',
    sede: data.sede || '',
    email: data.email || '',
    foto: data.foto || '',
  };
}

export function mapMiAsistenciaFromBackend(data: any): MiAsistencia {
  return {
    id: data.id,
    grado: data.grado || '',
    sede: data.sede || '',
    fecha: data.fecha,
    abierta: data.abierta === true,
    registroId: data.registro_id ?? null,
    metodo: data.metodo || null,
    registradoAt: data.registrado_at || null,
  };
}

export function mapSesionFromBackend(data: any): SesionClase {
  return {
    id: data.id,
    grado: data.grado || '',
    sede: data.sede || '',
    fecha: data.fecha,
    profesorId: data.profesor_id,
    abierta: data.abierta === true,
    createdAt: data.created_at,
    cerradaAt: data.cerrada_at || null,
    profesorNombre: data.profesor_nombre || '',
    profesorApellido: data.profesor_apellido || '',
    totalAsistencias: data.total_asistencias ?? 0,
  };
}

export function mapAlumnoEnSesionFromBackend(data: any): AlumnoEnSesion {
  return {
    id: data.id,
    nombre: data.nombre || '',
    primerApellido: data.primer_apellido || '',
    segundoApellido: data.segundo_apellido || '',
    grado: data.grado || '',
    sede: data.sede || '',
    foto: data.foto || '',
    asistenciaId: data.asistencia_id ?? null,
    metodo: data.metodo || null,
    registradoAt: data.registrado_at || null,
  };
}

export function mapResultadoRegistroFromBackend(data: any): ResultadoRegistro {
  const a = data.alumno || {};
  return {
    id: data.id,
    sesionId: data.sesion_id,
    alumnoId: data.alumno_id,
    metodo: data.metodo || 'qr',
    duplicado: data.duplicado === true,
    alumno: {
      id: a.id,
      nombre: a.nombre || '',
      primer_apellido: a.primer_apellido || '',
      segundo_apellido: a.segundo_apellido || '',
      grado: a.grado || '',
      sede: a.sede || '',
    },
  };
}

// El COUNT(*) y el id de inscripcion llegan como string porque Postgres cuenta
// en bigint. Se castean aqui para que la plantilla no tenga que hacerlo.
export function mapEventoFromBackend(data: any): Evento {
  return {
    id: data.id,
    nombre: data.nombre || '',
    tipo: data.tipo || 'torneo',
    fechaInicio: data.fecha_inicio,
    sede: data.sede || '',
    lugar: data.lugar || '',
    categorias: data.categorias || '',
    descripcion: data.descripcion || '',
    precioInscripcion: Number(data.precio_inscripcion) || 0,
    cupoMaximo: data.cupo_maximo === null || data.cupo_maximo === undefined ? null : Number(data.cupo_maximo),
    imagen: data.imagen || '',
    estado: data.estado || 'programado',
    inscritos: Number(data.inscritos) || 0,
    miInscripcion: data.mi_inscripcion ? Number(data.mi_inscripcion) : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function mapInscritoFromBackend(data: any): EventoInscrito {
  return {
    id: data.id,
    estado: data.estado || 'inscrito',
    createdAt: data.created_at,
    alumnoId: data.alumno_id,
    nombre: data.nombre || '',
    primerApellido: data.primer_apellido || '',
    segundoApellido: data.segundo_apellido || '',
    edad: data.edad === null || data.edad === undefined ? null : Number(data.edad),
    grado: data.grado || '',
    escuela: data.escuela || '',
  };
}

// datetime-local entrega "2026-10-15T13:00" sin zona, que new Date() interpreta
// como hora local. Al pasar a ISO se convierte a UTC y el backend lo guarda como
// timestamptz, que es lo unico que hace falta para que el reloj del alumno sea
// el mismo para todos los husos.
export function mapEventoToBackend(form: EventoFormData): any {
  const inicio = new Date(form.fechaInicioLocal);
  const fechaIso = Number.isNaN(inicio.getTime()) ? null : inicio.toISOString();

  return {
    nombre: form.nombre.trim(),
    tipo: form.tipo,
    estado: form.estado,
    fecha_inicio: fechaIso,
    sede: form.sede.trim(),
    lugar: form.lugar.trim(),
    categorias: form.categorias.trim(),
    descripcion: form.descripcion.trim(),
    precio_inscripcion: form.precioInscripcion || 0,
    cupo_maximo: form.cupoMaximo,
  };
}

// El cuerpo de POST /eventos/:id/inscribirse. La edad se manda como null y no
// como '' porque el backend la trata como ausente, no como cero.
//
// Se llama mapDatosInscripcion... y no mapInscripcion... a proposito: ya existe
// un mapInscripcionToBackend para el alta a cursos, que es otro modulo con otro
// cuerpo. Dos funciones con el mismo nombre y casi el mismo prefijo en el mismo
// archivo es la forma mas rapida de mandar los datos al endpoint equivocado.
export function mapDatosInscripcionToBackend(datos: DatosInscripcion): any {
  return {
    nombre: datos.nombre.trim(),
    primer_apellido: datos.primerApellido.trim(),
    segundo_apellido: datos.segundoApellido.trim(),
    edad: datos.edad === null || datos.edad === undefined ? null : datos.edad,
    grado: datos.grado.trim(),
    escuela: datos.escuela.trim(),
  };
}

// El inverso de lo anterior: un ISO a texto local para <input type="datetime-local">.
// Se resta el offset de la zona antes de recortar, porque toISOString() siempre
// devuelve UTC y el input espera la hora que el usuario tiene en su reloj.
export function isoAFechaLocal(fechaIso: string): string {
  if (!fechaIso) {
    return '';
  }
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) {
    return '';
  }
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
