import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cita, CitaRequest, EstadoCita } from '../models/cita.model';

@Injectable({ providedIn: 'root' })
export class AgendaService {

  private http = inject(HttpClient);

  // El interceptor (auth.interceptor.ts) ya agrega el header
  // Authorization: Bearer <token> a cada una de estas peticiones.
  private readonly baseUrl = `${environment.apiMedic}/api/citas`;

  private googleConectado = false;

  listarPorMedico(medicoId: string, desde?: string, hasta?: string): Observable<Cita[]> {
    let params = new HttpParams().set('medicoId', medicoId);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<Cita[]>(this.baseUrl, { params });
  }

  obtenerProximaCita(medicoId: string): Observable<Cita | null> {
    const params = new HttpParams().set('medicoId', medicoId);
    // El backend responde 204 (sin cuerpo) cuando no hay próxima cita;
    // HttpClient entrega `null` en ese caso.
    return this.http.get<Cita | null>(`${this.baseUrl}/proxima`, { params });
  }

  crear(request: CitaRequest): Observable<Cita> {
    return this.http.post<Cita>(this.baseUrl, request);
  }

  actualizar(id: number, request: CitaRequest): Observable<Cita> {
    return this.http.put<Cita>(`${this.baseUrl}/${id}`, request);
  }

  cambiarEstado(id: number, estado: EstadoCita): Observable<Cita> {
    return this.http.patch<Cita>(`${this.baseUrl}/${id}/estado`, { estado });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  get googleCalendarConectado(): boolean {
    return this.googleConectado;
  }

  // Placeholder: el backend todavía no tiene endpoint de Google Calendar.
  // Cuando lo tenga, esto pasa a ser un POST real que dispare el flujo OAuth.
  conectarGoogleCalendar(): Observable<{ conectado: boolean }> {
    this.googleConectado = true;
    return of({ conectado: true });
  }

  desconectarGoogleCalendar(): Observable<{ conectado: boolean }> {
    this.googleConectado = false;
    return of({ conectado: false });
  }
}
