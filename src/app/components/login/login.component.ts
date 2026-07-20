import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/login/auth.service';
import { LoginRequest } from '../../models/login/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  private authService = inject(AuthService);
  private router = inject(Router);

  credenciales: LoginRequest = {
    email: '',
    password: ''
  };

  cargando = signal(false);
  error = signal('');
  mostrarPassword = signal(false);

  togglePassword(): void {
    this.mostrarPassword.update(v => !v);
  }

  onSubmit(): void {
    this.error.set('');

    if (!this.credenciales.email.trim() || !this.credenciales.password) {
      this.error.set('Ingresa tu correo y contraseña.');
      return;
    }

    this.cargando.set(true);

    this.authService.login(this.credenciales).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.cargando.set(false);
        if (err?.status === 401) {
          this.error.set('Correo o contraseña incorrectos.');
        } else if (err?.status === 0) {
          this.error.set('No se pudo conectar con el servidor. Verifica tu conexión.');
        } else {
          this.error.set('Ocurrió un error al iniciar sesión. Intenta de nuevo.');
        }
        console.error(err);
      }
    });
  }
}
