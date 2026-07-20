// Espeja com.exp.medic.dto.catalgos.response.EspecialidadResponseDTO
export interface Especialidad {
  id: number;
  nombre: string;
}

// Espeja com.exp.medic.dto.catalgos.response.SubespecialidadResponseDTO
export interface Subespecialidad {
  id: number;
  nombre: string;
  especialidadId: number;
  especialidadNombre: string;
}
