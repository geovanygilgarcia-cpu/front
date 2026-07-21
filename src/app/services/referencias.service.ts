import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ReferenciaRequest, ReferenciaResponse } from '../models/referencia.model';

@Injectable({ providedIn: 'root' })
export class ReferenciaService {
  private readonly baseUrl = `${environment.apiMedic}/api/referencias`;

  constructor(private http: HttpClient) {}

  crear(referencia: ReferenciaRequest): Observable<ReferenciaResponse> {
    return this.http.post<ReferenciaResponse>(this.baseUrl, referencia);
  }

  /** Referencias pendientes dirigidas al médico logueado. */
  listarPendientes(): Observable<ReferenciaResponse[]> {
    return this.http.get<ReferenciaResponse[]>(`${this.baseUrl}/pendientes`);
  }

  aceptar(id: number): Observable<ReferenciaResponse> {
    return this.http.put<ReferenciaResponse>(`${this.baseUrl}/${id}/aceptar`, {});
  }

  rechazar(id: number): Observable<ReferenciaResponse> {
    return this.http.put<ReferenciaResponse>(`${this.baseUrl}/${id}/rechazar`, {});
  }
}
