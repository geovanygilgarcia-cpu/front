import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/login/auth.service';

/** Requiere sesión ADMIN. Úsalo junto con authGuard: [authGuard, adminGuard]. */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.usuarioActual()?.rol === 'ADMIN') {
    return true;
  }

  router.navigate(['/']);
  return false;
};
