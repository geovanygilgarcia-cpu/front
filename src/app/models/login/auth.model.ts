export interface LoginRequest {
  email: string;
  password: string;
}

export type Rol = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION';

export interface LoginResponse {
  token: string;
  rol: Rol;
  nombreCompleto: string;
  especialidad?: string;
  subespecialidad?: string;
}

export interface UsuarioSesion {
  nombreCompleto: string;
  rol: Rol;
  especialidad?: string;
  subespecialidad?: string;
}
