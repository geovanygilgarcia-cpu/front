export interface LoginRequest {
  email: string;
  password: string;
}

export type Rol = 'ADMIN' | 'MEDICO' | 'ENFERMERA' | 'RECEPCION';

export type Sexo = 'M' | 'F';

export interface LoginResponse {
  token: string;
  rol: Rol;
  nombreCompleto: string;
  sexo?: Sexo;
  especialidad?: string;
  subespecialidad?: string;
}

export interface UsuarioSesion {
  nombreCompleto: string;
  rol: Rol;
  sexo?: Sexo;
  especialidad?: string;
  subespecialidad?: string;
}
