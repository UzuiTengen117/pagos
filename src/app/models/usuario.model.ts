export type RolUsuario = 'estudiante' | 'profesor' | 'administrador';

export interface Usuario {
  id: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  username: string;
  email: string;
  rol: RolUsuario;
  fechaCreacion: Date;
  foto?: string;
  preguntaSecreta?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  primerApellido?: string;
  segundoApellido?: string;
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
  rol?: string;
}
