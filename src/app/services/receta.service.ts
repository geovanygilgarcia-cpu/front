import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RecetaDTO, RecetaResponseDTO } from '../models/receta.model';

@Injectable({ providedIn: 'root' })
export class RecetaService {
  private readonly baseUrl = `${environment.apiUrl}/api/recetas`;

  constructor(private http: HttpClient) {}

  crear(receta: RecetaDTO): Observable<RecetaResponseDTO> {
    return this.http.post<RecetaResponseDTO>(this.baseUrl, receta);
  }

  actualizar(id: number, receta: RecetaDTO): Observable<RecetaResponseDTO> {
    return this.http.put<RecetaResponseDTO>(`${this.baseUrl}/${id}`, receta);
  }

  listarTodas(): Observable<RecetaResponseDTO[]> {
    return this.http.get<RecetaResponseDTO[]>(this.baseUrl);
  }

  obtenerPorId(id: number): Observable<RecetaResponseDTO> {
    return this.http.get<RecetaResponseDTO>(`${this.baseUrl}/${id}`);
  }

  listarPorPaciente(pacienteId: number): Observable<RecetaResponseDTO[]> {
    return this.http.get<RecetaResponseDTO[]>(`${this.baseUrl}/paciente/${pacienteId}`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
