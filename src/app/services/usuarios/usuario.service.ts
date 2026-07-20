import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol } from '../../models/login/auth.model';
import { UsuarioRequest, UsuarioUpdateRequest, UsuarioResponse } from '../../models/usuarios/usuario.model';


@Injectable({ providedIn: 'root' })
export class UsuarioService {

  private http = inject(HttpClient);

  // El interceptor (auth.interceptor.ts) ya agrega el header
  // Authorization: Bearer <token> a cada una de estas peticiones.
  private readonly apiUrl = `${environment.apiAuth}/api/auth/usuarios`;

  listar(rol?: Rol): Observable<UsuarioResponse[]> {
    const url = rol ? `${this.apiUrl}?rol=${rol}` : this.apiUrl;
    return this.http.get<UsuarioResponse[]>(url);
  }

  obtener(id: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/${id}`);
  }

  crear(request: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(this.apiUrl, request);
  }

  actualizar(id: string, request: UsuarioUpdateRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${id}`, request);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
