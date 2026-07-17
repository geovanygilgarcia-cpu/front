export interface Medicamento {
  id: number;
  medicamento: string;
  indicacion: string;
}

export interface MedicamentoRequest {
  medicamento: string;
  indicacion: string;
}
