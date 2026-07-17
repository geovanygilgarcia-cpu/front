import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RecetaDTO } from '../models/receta.model';
import { PatientIntakeFormDTO } from '../models/historial.model';

/**
 * Servicio de PDFs (receta médica e historia clínica).
 *
 * Corre en el microservicio `cics` (Spring Boot separado del backend
 * principal `medic`), por eso usa environment.apiCics en vez de
 * environment.apiMedic (que usan paciente.service / receta.service /
 * historial.service).
 *
 * Si cambia la URL de este servicio, solo hay que tocar apiCics en
 * environment.ts / environment.prod.ts.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly baseUrl = `${environment.apiCics}/api/expedientes`;

  constructor(private http: HttpClient) {}

  /**
   * Genera el PDF de una receta médica.
   * observe: 'response' para poder leer el header Content-Disposition (nombre de archivo).
   * responseType: 'blob' porque el backend regresa los bytes del PDF, no JSON.
   */
  generarRecetaPdf(dto: RecetaDTO): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/receta-medica`, dto, {
      observe: 'response',
      responseType: 'blob'
    });
  }

  /** Genera el PDF de una historia clínica. */
  generarHistoriaPdf(dto: PatientIntakeFormDTO): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.baseUrl}/historia-clinica`, dto, {
      observe: 'response',
      responseType: 'blob'
    });
  }
}
