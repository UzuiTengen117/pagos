export interface MiQrAlumno {
  id: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  username: string;
  grado: string;
  sede: string;
  email: string;
  foto: string;
}

export interface MiQr {
  token: string;
  alumno: MiQrAlumno;
}

export interface MiAsistencia {
  id: number;
  grado: string;
  sede: string;
  fecha: string;
  abierta: boolean;
  registroId: number | null;
  metodo: string | null;
  registradoAt: string | null;
}

export interface SesionClase {
  id: number;
  grado: string;
  sede: string;
  fecha: string;
  profesorId: number;
  abierta: boolean;
  createdAt: string;
  cerradaAt: string | null;
  profesorNombre?: string;
  profesorApellido?: string;
  totalAsistencias?: number;
  // No viene del backend: se calcula en el reporte contando los alumnos
  // registrados hoy en ese grado y sede.
  totalEsperados?: number;
}

export interface AlumnoEnSesion {
  id: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  grado: string;
  sede: string;
  foto: string;
  asistenciaId: number | null;
  metodo: string | null;
  registradoAt: string | null;
}

export interface ResultadoRegistro {
  id: number;
  sesionId: number;
  alumnoId: number;
  metodo: string;
  duplicado: boolean;
  alumno: {
    id: number;
    nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    grado: string;
    sede: string;
  };
}
