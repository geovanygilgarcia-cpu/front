import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioSesion } from '../../models/login/auth.model';

const TOKEN_KEY = 'expediente_token';
const USUARIO_KEY = 'expediente_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly apiUrl = `${environment.apiAuth}/api/auth`;

  /** Señal reactiva con el usuario actual (null si no hay sesión). Útil para mostrar nombre/rol en la UI sin volver a leer localStorage en cada sitio. */
  usuarioActual = signal<UsuarioSesion | null>(this.leerUsuarioGuardado());

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credenciales).pipe(
      tap((respuesta) => this.guardarSesion(respuesta))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get estaAutenticado(): boolean {
    return !!this.token;
  }

  private guardarSesion(respuesta: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, respuesta.token);
    const usuario: UsuarioSesion = {
      id: respuesta.id,
      nombreCompleto: respuesta.nombreCompleto,
      rol: respuesta.rol,
      sexo: respuesta.sexo,
      especialidad: respuesta.especialidad,
      subespecialidad: respuesta.subespecialidad
    };
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    this.usuarioActual.set(usuario);
  }

  private leerUsuarioGuardado(): UsuarioSesion | null {
    const crudo = localStorage.getItem(USUARIO_KEY);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as UsuarioSesion;
    } catch {
      return null;
    }
  }
}
