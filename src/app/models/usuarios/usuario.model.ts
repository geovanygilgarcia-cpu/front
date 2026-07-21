import { Rol } from '../login/auth.model';

export type Sexo = 'M' | 'F';

export interface UsuarioRequest {
  email: string;
  password: string;
  nombreCompleto: string;
  sexo?: Sexo;
  cedulaProfesional?: string;
  especialidad?: string;
  subespecialidad?: string;
  rol: Rol;
}

export interface UsuarioUpdateRequest {
  email: string;
  // null/omitido = no cambiar la contraseña actual (así lo espera el backend)
  password?: string | null;
  nombreCompleto: string;
  sexo?: Sexo;
  cedulaProfesional?: string;
  especialidad?: string;
  subespecialidad?: string;
  rol: Rol;
  activo: boolean;
}

export interface UsuarioResponse {
  id: string;
  email: string;
  nombreCompleto: string;
  sexo?: Sexo;
  cedulaProfesional?: string;
  especialidad?: string;
  subespecialidad?: string;
  rol: Rol;
  activo: boolean;
}
