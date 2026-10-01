import { Usuario, RolUsuario } from '../models/usuario.model';
import { Alumno } from '../models/alumno.model';
import { Pago } from '../models/pago.model';
import { Beca } from '../models/beca.model';
import { Precio } from '../models/precio.model';
import { Comprobante } from '../models/comprobante.model';
import { Inscripcion } from '../models/inscripcion.model';
import { SolicitudReembolso } from '../models/reembolso.model';
import { MiQrAlumno, MiAsistencia, SesionClase, AlumnoEnSesion, ResultadoRegistro } from '../models/asistencia.model';
import { DatosInscripcion, Evento, EventoFormData, EventoInscrito } from '../models/evento.model';
import { Examen, ExamenFormData, ExamenInscrito, SolicitudExamen, CalificacionExamen } from '../models/examen.model';

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

// Devuelve `EventoInscrito` y no un tipo por modulo. Antes `ExamenInscrito` era
// identico a este y la tipacion estructural lo aceptaba; ya no lo es, porque un
// examen lleva la hoja de solicitud y un evento no. Para las filas de examen esta
// la hoja entera y hay que usar `mapExamenInscritoFromBackend`.
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

// Un NUMERIC de Postgres llega como STRING, no como numero: es el tipo exacto por
// precision y el driver no lo convierte. Sin este Number(), `cal_basicos` seria
// "8.50", y "8.50" + 1 da "8.501" en una concatenacion y `String(8.50)` da
// "8.5", o sea que el mismo dato se veria distinto segun por donde pasara.
function numeroSql(v: any): number | null {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Una columna DATE de Postgres la parsea el driver a un Date en hora LOCAL. Un
// '2026-05-01' midnight UTC-shelf se vuelve 30 de abril en cualquier huso al oeste
// de Greenwich, y un `<input type="date">` con ese valor muestra el dia anterior.
//
// Por eso se reconstruye la fecha desde las piezas locales del Date, nunca con
// toISOString(): aqui se quiere el dia que escribio el usuario, no el dia UTC.
//
// El caso de que ya venga como string se cubre porque un backend con un type
// parser propio, o un futuro JSON serializado, lo darian asi y el mapper tiene
// que servir para los dos sin que nadie se acuerde de cual.
function fechaSql(v: any): string {
  if (v === null || v === undefined || v === '') {
    return '';
  }
  if (typeof v === 'string') {
    // Si ya viene "YYYY-MM-DD" (o con hora) se queda con las 10 primeras.
    return v.slice(0, 10);
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const mes = String(v.getMonth() + 1).padStart(2, '0');
    const dia = String(v.getDate()).padStart(2, '0');
    return `${v.getFullYear()}-${mes}-${dia}`;
  }
  return '';
}

// El backend guarda la firma SIN el prefijo `data:image/png;base64,` porque es
// constante y no es dato. Para ponerla en un <img> hay que volver a anteponerlo,
// y esta es la unica funcion que sabe eso.
const PREFIJO_FIRMA = 'data:image/png;base64,';

export function prefijoFirma(payload: string | null | undefined): string {
  if (!payload) {
    return '';
  }
  // Si el backend en algun momento devuelve la data URL entera, no se duplica el
  // prefijo: una URL con el prefijo dos veces no carga y el <img> sale roto sin
  // ningun error en consola que lo explique.
  return payload.startsWith('data:') ? payload : PREFIJO_FIRMA + payload;
}

// La fila de "inscritos" de un examen, con toda la hoja.
//
// No se extiende `mapInscritoFromBackend` a proposito: esa devuelve un
// `EventoInscrito` de seis campos y la hoja del examen tiene treinta. Compartirla
// obligaria a que el reporte de eventos cargara campos que no existen ahi, o a que
// quede marcada opcional la mitad de lo que el examen si necesita.
export function mapExamenInscritoFromBackend(data: any): ExamenInscrito {
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
    numeroExamen: data.numero_examen ?? null,
    direccion: data.direccion ?? null,
    telefono: data.telefono ?? null,
    fechaNacimiento: fechaSql(data.fecha_nacimiento),
    fechaIngreso: fechaSql(data.fecha_ingreso),
    gradoAPasar: data.grado_a_pasar ?? null,
    fechaExamenAnterior: fechaSql(data.fecha_examen_anterior),
    fechaUltimoTorneo: fechaSql(data.fecha_ultimo_torneo),
    fechaSolicitud: fechaSql(data.fecha_solicitud),
    profesorAutoriza: data.profesor_autoriza ?? null,
    firmaSolicitante: prefijoFirma(data.firma_solicitante),
    firmaPadre: prefijoFirma(data.firma_padre),
    recordAsistencia: numeroSql(data.record_asistencia),
    calBasicos: numeroSql(data.cal_basicos),
    calRompimientos: numeroSql(data.cal_rompimientos),
    calPateo: numeroSql(data.cal_pateo),
    calCombateLibre: numeroSql(data.cal_combate_libre),
    calFormas: numeroSql(data.cal_formas),
    calDefensaPersonal: numeroSql(data.cal_defensa_personal),
    notaCombateUnPaso: data.nota_combate_un_paso ?? null,
    notaPateoSaltando: data.nota_pateo_saltando ?? null,
    comentarios: data.comentarios ?? null,
    // Triestado y NO `data.aprobado || false`: ese `||` convierte el null en
    // false, que es exactamente el bug que hace que un alumno sin calificar
    // aparezca reprobado. Aca se pasa el valor tal cual.
    aprobado: data.aprobado === null || data.aprobado === undefined ? null : Boolean(data.aprobado),
    firmaExaminador: prefijoFirma(data.firma_examinador),
    calificadoAt: data.calificado_at ?? null,
  };
}

// El cuerpo de POST /examenes/:id/inscribirse: los seis campos de identidad que
// ya existian MAS el bloque del alumno de la hoja, en el mismo request.
//
// Se separa de `mapDatosInscripcionToBackend` en vez de extenderlo porque ese es
// el cuerpo de los EVENTOS, que no tienen hoja. Meterle campos de examen
// obligaria a los eventos a mandarlos.
export function mapSolicitudExamenToBackend(datos: DatosInscripcion, s: SolicitudExamen): any {
  return {
    ...mapDatosInscripcionToBackend(datos),
    numero_examen: s.numeroExamen.trim(),
    direccion: s.direccion.trim(),
    telefono: s.telefono.trim(),
    // "" en vez de null: un <input type="date"> vacio entrega "" y el backend lo
    // trata como ausente. Mandar null explicitamente tambien funciona, pero ""
    // deja claro que el dato no lo escribio nadie y no que alguien lo borro.
    fecha_nacimiento: s.fechaNacimiento || null,
    fecha_ingreso: s.fechaIngreso || null,
    grado_a_pasar: s.gradoAPasar.trim(),
    fecha_examen_anterior: s.fechaExamenAnterior || null,
    fecha_ultimo_torneo: s.fechaUltimoTorneo || null,
    fecha_solicitud: s.fechaSolicitud || null,
    profesor_autoriza: s.profesorAutoriza.trim(),
    // Se manda la data URL ENTERA, con prefijo. El backend lo valida y guarda solo
    // el payload; mandarlo sin prefijo seria obligar al backend a adivinar de que
    // imagen se trata.
    firma_solicitante: s.firmaSolicitante || null,
    firma_padre: s.firmaPadre || null,
  };
}

// El cuerpo de PUT /examenes/:id/inscritos/:inscripcionId/calificacion.
export function mapCalificacionExamenToBackend(c: CalificacionExamen): any {
  return {
    // null y no 0 cuando el campo esta vacio: un 0 es una nota real (el alumno no
    // rompio nada) y un null es "el examinador todavia no lo puso".
    record_asistencia: c.recordAsistencia,
    cal_basicos: c.calBasicos,
    cal_rompimientos: c.calRompimientos,
    cal_pateo: c.calPateo,
    cal_combate_libre: c.calCombateLibre,
    cal_formas: c.calFormas,
    cal_defensa_personal: c.calDefensaPersonal,
    nota_combate_un_paso: c.notaCombateUnPaso.trim(),
    nota_pateo_saltando: c.notaPateoSaltando.trim(),
    comentarios: c.comentarios.trim(),
    // null = sin calificar. Los dos booleanos viajan como booleanos de verdad y
    // no como "true"/"false" en texto: el backend acepta las dos formas, pero
    // mandarlo tipado hace que el valor llegue a la base sin pasar por un
    // string-to-bool del que dependa el resultado.
    aprobado: c.aprobado,
    firma_examinador: c.firmaExaminador || null,
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

// --- Examenes ---
//
// Solo hay dos mappers propios: la fila de la inscripcion y el cuerpo del
// formulario se reusan tal cual, porque el examen guarda exactamente los mismos
// seis campos que el evento con la misma validacion. Duplicarlos daria dos
// funciones que hoy son iguales y divergen en el primer cambio.

export function mapExamenFromBackend(data: any): Examen {
  return {
    id: data.id,
    nombre: data.nombre || '',
    niveles: data.niveles || '',
    fechaExamen: data.fecha_examen,
    sede: data.sede || '',
    lugar: data.lugar || '',
    descripcion: data.descripcion || '',
    precioInscripcion: Number(data.precio_inscripcion) || 0,
    cupoMaximo: data.cupo_maximo === null || data.cupo_maximo === undefined ? null : Number(data.cupo_maximo),
    imagen: data.imagen || '',
    tieneHoja: Boolean(data.tiene_hoja),
    estado: data.estado || 'programado',
    inscritos: Number(data.inscritos) || 0,
    miInscripcion: data.mi_inscripcion ? Number(data.mi_inscripcion) : null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export function mapExamenToBackend(form: ExamenFormData): any {
  const examen = new Date(form.fechaExamenLocal);
  const fechaIso = Number.isNaN(examen.getTime()) ? null : examen.toISOString();

  return {
    nombre: form.nombre.trim(),
    estado: form.estado,
    fecha_examen: fechaIso,
    sede: form.sede.trim(),
    lugar: form.lugar.trim(),
    niveles: form.niveles.trim(),
    descripcion: form.descripcion.trim(),
    precio_inscripcion: form.precioInscripcion || 0,
    cupo_maximo: form.cupoMaximo,
  };
}
