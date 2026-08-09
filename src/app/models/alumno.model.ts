export interface Alumno {
  id: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  username: string;
  email: string;
  telefono: string;
  grado: string;
  sede: string;
  fechaInscripcion: Date;
  beca: number;
  activo: boolean;
  usuarioId?: number;
  becaId?: number;
}
