import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paciente, PacienteRequest } from '../models/paciente.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly baseUrl = `${environment.apiUrl}/api/pacientes`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.baseUrl);
  }

  obtenerPorId(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/${id}`);
  }

  crear(paciente: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(this.baseUrl, paciente);
  }

  actualizar(id: number, paciente: PacienteRequest): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.baseUrl}/${id}`, paciente);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
