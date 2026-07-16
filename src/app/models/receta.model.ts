export interface FechaDTO {
  dia: string;
  mes: string;
  anio: string;
}

export interface SignosVitalesDTO {
  peso: string;
  talla: string;
  ta: string;
  fc: string;
  fr: string;
  temp: string;
  sato2: string;
  imc: string;
  alergias: string;
}

export interface RecetaDTO {
  pacienteId: number;
  folio: string;
  paciente: string;
  edad: string;
  fecha: FechaDTO;
  signosVitales: SignosVitalesDTO;
  idx: string;
  diagnosticoTratamiento: string;
  proximaCita: string; // dd/MM/yyyy
  firma: string;
}

export interface RecetaResponseDTO extends RecetaDTO {
  id: number;
  createdAt: string;
}
