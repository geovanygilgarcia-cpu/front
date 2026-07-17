import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Medicamento, MedicamentoRequest } from '../models/medicamento.model';

@Injectable({ providedIn: 'root' })
export class MedicamentoService {

  private readonly baseUrl = `${environment.apiMedic}/api/medicamentos`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Medicamento[]> {
    return this.http.get<Medicamento[]>(this.baseUrl);
  }

  buscarPorNombre(nombre: string): Observable<Medicamento[]> {
    return this.http.get<Medicamento[]>(this.baseUrl, { params: { nombre } });
  }

  obtenerPorId(id: number): Observable<Medicamento> {
    return this.http.get<Medicamento>(`${this.baseUrl}/${id}`);
  }

  crear(dto: MedicamentoRequest): Observable<Medicamento> {
    return this.http.post<Medicamento>(this.baseUrl, dto);
  }

  actualizar(id: number, dto: MedicamentoRequest): Observable<Medicamento> {
    return this.http.put<Medicamento>(`${this.baseUrl}/${id}`, dto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
