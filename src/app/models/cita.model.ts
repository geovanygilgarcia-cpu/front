// Modelo de citas de la agenda médica.
// Cuando el backend exponga /api/citas, este archivo debería reflejar
// el DTO real (igual que paciente.model.ts espeja PacienteResponseDTO).

export type EstadoCita = 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA';

export const TIPOS_CITA = [
  'Consulta general',
  'Primera vez',
  'Seguimiento',
  'Control',
  'Estudio / procedimiento'
] as const;

export interface Cita {
  id: number;
  medicoId: string;
  medicoNombre: string;
  pacienteNombre: string;
  pacienteId?: number | null;
  fecha: string;        // yyyy-MM-dd
  horaInicio: string;   // HH:mm
  horaFin: string;      // HH:mm
  tipo: string;
  estado: EstadoCita;
  notas?: string | null;
  // Se llenará cuando exista sincronización con Google Calendar.
  googleEventId?: string | null;
}

export interface CitaRequest {
  medicoId: string;
  medicoNombre: string;
  pacienteNombre: string;
  pacienteId?: number | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipo: string;
  estado: EstadoCita;
  notas?: string | null;
}

export interface MedicoAgenda {
  id: string;
  nombreCompleto: string;
  especialidad?: string;
}
