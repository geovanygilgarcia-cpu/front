import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Especialidad, Subespecialidad } from '../../models/usuarios/especialidad.model';

@Injectable({ providedIn: 'root' })
export class EspecialidadService {

  private http = inject(HttpClient);

  // Este catálogo vive en medic-service (junto con pacientes/medicamentos),
  // no en auth-service.
  private readonly apiUrl = `${environment.apiMedic}/api`;

  listarEspecialidades(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(`${this.apiUrl}/especialidades`);
  }

  listarSubespecialidades(especialidadId: number): Observable<Subespecialidad[]> {
    return this.http.get<Subespecialidad[]>(
      `${this.apiUrl}/subespecialidades?especialidadId=${especialidadId}`
    );
  }
}
