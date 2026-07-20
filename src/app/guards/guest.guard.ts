import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/login/auth.service';

/** Evita que alguien ya autenticado vuelva a ver /login; lo manda directo al expediente. */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
