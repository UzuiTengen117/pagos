import { Usuario, RolUsuario } from '../models/usuario.model';
import { Alumno } from '../models/alumno.model';
import { Pago } from '../models/pago.model';
import { Beca } from '../models/beca.model';
import { Precio } from '../models/precio.model';
import { Comprobante } from '../models/comprobante.model';
import { Inscripcion } from '../models/inscripcion.model';
import { SolicitudReembolso } from '../models/reembolso.model';

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
