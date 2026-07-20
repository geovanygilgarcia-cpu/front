// Espeja com.exp.medic.dto.paciente.response.PacienteResponseDTO
export interface Paciente {
  id: number;
  expediente: string;
  nombreCompleto: string;
  iniciales: string;
  edad: number | null;
  telefono: string | null;
  fechaNacimiento: string | null; // yyyy-MM-dd
  email: string | null;
  genero: string | null;
  contactoEmergencia: string | null;
  medicoId: string | null;
  medicoNombre: string | null;
  createdAt: string;
}

// Para crear/actualizar (POST/PUT) - espeja PacienteDTO
export interface PacienteRequest {
  expediente: string;
  nombreCompleto: string;
  telefono?: string;
  fechaNacimiento?: string;
  email?: string;
  genero?: string;
  contactoEmergencia?: string;
}
