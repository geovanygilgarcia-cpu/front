import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/login/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

  // No mandes el token a la llamada de login (todavía no existe / no aplica)
  const esLogin = req.url.includes('/api/auth/login');

  const request = (token && !esLogin)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err) => {
      if (err.status === 401 && !esLogin) {
        // Token vencido o inválido: cierra sesión y manda a /login
        authService.logout();
      }
      return throwError(() => err);
    })
  );
};
