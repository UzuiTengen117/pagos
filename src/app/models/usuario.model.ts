export type RolUsuario = 'alumno' | 'profesor' | 'administrador';

export interface Usuario {
  id: number;
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  username: string;
  password: string;
  rol: RolUsuario;
  fechaCreacion: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  username: string;
  password: string;
  confirmPassword: string;
}
