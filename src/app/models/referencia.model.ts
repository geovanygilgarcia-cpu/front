export type EstadoReferencia = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';

// Espeja com.exp.medic.dto.referencia.response.ReferenciaResponseDTO
export interface ReferenciaResponse {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  medicoOrigenId: string;
  medicoOrigenNombre: string;
  medicoDestinoId: string;
  medicoDestinoNombre: string;
  motivo: string | null;
  estado: EstadoReferencia;
  fechaCreacion: string; // ISO datetime
  fechaResolucion: string | null;
}

// Para crear (POST) - espeja ReferenciaRequestDTO
export interface ReferenciaRequest {
  pacienteId: number;
  medicoDestinoId: string;
  medicoDestinoNombre: string;
  motivo?: string;
}
