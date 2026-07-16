import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PatientIntakeFormDTO, HistoriaClinicaResponseDTO } from '../models/historial.model';

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private readonly baseUrl = `${environment.apiUrl}/api/historias`;

  constructor(private http: HttpClient) {}

  crear(historial: PatientIntakeFormDTO): Observable<HistoriaClinicaResponseDTO> {
    return this.http.post<HistoriaClinicaResponseDTO>(this.baseUrl, historial);
  }

  actualizar(id: number, historial: PatientIntakeFormDTO): Observable<HistoriaClinicaResponseDTO> {
    return this.http.put<HistoriaClinicaResponseDTO>(`${this.baseUrl}/${id}`, historial);
  }

  listarTodas(): Observable<HistoriaClinicaResponseDTO[]> {
    return this.http.get<HistoriaClinicaResponseDTO[]>(this.baseUrl);
  }

  obtenerPorId(id: number): Observable<HistoriaClinicaResponseDTO> {
    return this.http.get<HistoriaClinicaResponseDTO>(`${this.baseUrl}/${id}`);
  }

  listarPorPaciente(pacienteId: number): Observable<HistoriaClinicaResponseDTO[]> {
    return this.http.get<HistoriaClinicaResponseDTO[]>(`${this.baseUrl}/paciente/${pacienteId}`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
