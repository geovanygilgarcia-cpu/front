import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RecetaDTO } from '../models/receta.model';
import { PatientIntakeFormDTO } from '../models/historial.model';

/**
 * Servicio de PDFs (receta médica e historia clínica).
 *
 * Corre como una aplicación Spring Boot separada del backend principal,
 * en el puerto 8090, por eso tiene su propia baseUrl en vez de compartir
 * la de paciente.service / receta.service / historial.service (que siguen
 * en 8080).
 *
 * Si cambias el puerto de este servicio, solo hay que tocar baseUrl aquí.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly baseUrl = 'http://localhost:8080/api/expedientes';

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
