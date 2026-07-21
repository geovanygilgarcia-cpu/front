import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { AuthService } from '../../services/login/auth.service';
import { Rol } from '../../models/login/auth.model';
import { UsuarioRequest, UsuarioUpdateRequest, UsuarioResponse, Sexo } from '../../models/usuarios/usuario.model';
import { EspecialidadService } from '../../services/usuarios/especialidad.service';
import { Especialidad, Subespecialidad } from '../../models/usuarios/especialidad.model';

type ToastTipo = 'success' | 'error';
interface Toast { id: number; tipo: ToastTipo; mensaje: string; }

interface UsuarioForm {
  email: string;
  password: string;
  nombreCompleto: string;
  sexo: Sexo | '';
  cedulaProfesional: string;
  especialidad: string;
  subespecialidad: string;
  rol: Rol;
  activo: boolean;
}

const FORM_VACIO: UsuarioForm = {
  email: '',
  password: '',
  nombreCompleto: '',
  sexo: '',
  cedulaProfesional: '',
  especialidad: '',
  subespecialidad: '',
  rol: 'MEDICO',
  activo: true
};

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent implements OnInit {

  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private especialidadService = inject(EspecialidadService);
  private cdr = inject(ChangeDetectorRef);

  readonly roles: Rol[] = ['ADMIN', 'MEDICO', 'ENFERMERA', 'RECEPCION'];
  readonly sexos: Sexo[] = ['M', 'F'];

  ngOnInit(): void {
    this.cargarUsuarios();
    this.cargarEspecialidades();
  }

  private refrescarVista(): void {
    this.cdr.markForCheck();
  }

  cerrarSesion(): void {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Volverás a la pantalla de inicio de sesión.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2F6F6B',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then(result => {
      if (result.isConfirmed) {
        this.authService.logout();
      }
      this.refrescarVista();
    });
  }

  // ==================================================================
  // ===== TOASTS =========================================================
  // ==================================================================

  toasts: Toast[] = [];
  private toastIdCounter = 0;

  mostrarToast(mensaje: string, tipo: ToastTipo = 'success'): void {
    const id = ++this.toastIdCounter;
    this.toasts.push({ id, tipo, mensaje });
    this.refrescarVista();
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
      this.refrescarVista();
    }, 3500);
  }

  private mostrarErrorBackend(err: any, mensajeDefault: string): void {
    const cuerpo = err?.error;
    const mensaje = (cuerpo && typeof cuerpo.error === 'string') ? cuerpo.error : mensajeDefault;

    let html = `<p style="margin:0 0 8px;">${mensaje}</p>`;
    if (cuerpo?.campos && typeof cuerpo.campos === 'object') {
      const items = Object.entries(cuerpo.campos)
        .map(([campo, msg]) => `<li><b>${campo}</b>: ${msg}</li>`)
        .join('');
      html += `<ul style="text-align:left; margin:0; padding-left:18px;">${items}</ul>`;
    }

    Swal.fire({
      title: 'No se pudo completar',
      html,
      icon: 'error',
      confirmButtonColor: '#e74c3c',
      confirmButtonText: 'Aceptar'
    }).then(() => this.refrescarVista());
  }

  // ==================================================================
  // ===== LISTADO =========================================================
  // ==================================================================

  usuarios: UsuarioResponse[] = [];
  cargando = true;
  error = '';
  filtroRol: Rol | '' = '';
  filtroTexto = '';

  get usuariosFiltrados(): UsuarioResponse[] {
    const q = this.filtroTexto.trim().toLowerCase();
    if (!q) return this.usuarios;
    return this.usuarios.filter(u =>
      u.nombreCompleto.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.error = '';

    this.usuarioService.listar(this.filtroRol || undefined).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.cargando = false;
        this.refrescarVista();
      },
      error: (err) => {
        this.cargando = false;
        this.error = 'No se pudo cargar la lista de usuarios.';
        console.error(err);
        this.refrescarVista();
      }
    });
  }

  cambiarFiltroRol(rol: Rol | ''): void {
    this.filtroRol = rol;
    this.cargarUsuarios();
  }

  // ==================================================================
  // ===== CATÁLOGO DE ESPECIALIDADES (selects encadenados) ==============
  // ==================================================================

  especialidades: Especialidad[] = [];
  subespecialidades: Subespecialidad[] = [];

  especialidadSeleccionadaId: number | null = null;
  subespecialidadSeleccionadaId: number | null = null;

  cargarEspecialidades(): void {
    this.especialidadService.listarEspecialidades().subscribe({
      next: (data) => {
        this.especialidades = data;
        this.refrescarVista();
      },
      error: (err) => console.error('No se pudo cargar el catálogo de especialidades:', err)
    });
  }

  /** Se llama cuando cambia el <select> de especialidad. */
  onCambiarEspecialidad(especialidadId: number | null): void {
    this.especialidadSeleccionadaId = especialidadId;
    this.subespecialidadSeleccionadaId = null;
    this.subespecialidades = [];
    this.form.subespecialidad = '';

    const especialidad = this.especialidades.find(e => e.id === especialidadId);
    this.form.especialidad = especialidad?.nombre ?? '';

    if (especialidadId != null) {
      this.especialidadService.listarSubespecialidades(especialidadId).subscribe({
        next: (data) => {
          this.subespecialidades = data;
          this.refrescarVista();
        },
        error: (err) => console.error('No se pudo cargar el catálogo de subespecialidades:', err)
      });
    }
  }

  /** Se llama cuando cambia el <select> de subespecialidad. */
  onCambiarSubespecialidad(subespecialidadId: number | null): void {
    this.subespecialidadSeleccionadaId = subespecialidadId;
    const subespecialidad = this.subespecialidades.find(s => s.id === subespecialidadId);
    this.form.subespecialidad = subespecialidad?.nombre ?? '';
  }

  /**
   * Al editar un médico que ya tiene especialidad/subespecialidad guardadas
   * (como texto), intenta ubicar esos nombres dentro del catálogo para que
   * los selects aparezcan preseleccionados. Si el texto no coincide con
   * ningún elemento del catálogo (por ejemplo, quedó de antes de tener
   * catálogo), los selects simplemente quedan sin selección, pero el texto
   * original se conserva hasta que el usuario cambie algo.
   */
  private preseleccionarEspecialidad(especialidadTexto: string, subespecialidadTexto: string): void {
    this.especialidadSeleccionadaId = null;
    this.subespecialidadSeleccionadaId = null;
    this.subespecialidades = [];

    if (!especialidadTexto) return;

    const especialidad = this.especialidades.find(
      e => e.nombre.trim().toLowerCase() === especialidadTexto.trim().toLowerCase()
    );
    if (!especialidad) return;

    this.especialidadSeleccionadaId = especialidad.id;

    this.especialidadService.listarSubespecialidades(especialidad.id).subscribe({
      next: (data) => {
        this.subespecialidades = data;
        if (subespecialidadTexto) {
          const subespecialidad = data.find(
            s => s.nombre.trim().toLowerCase() === subespecialidadTexto.trim().toLowerCase()
          );
          this.subespecialidadSeleccionadaId = subespecialidad?.id ?? null;
        }
        this.refrescarVista();
      },
      error: (err) => console.error('No se pudo cargar el catálogo de subespecialidades:', err)
    });
  }

  // ==================================================================
  // ===== MODAL crear/editar ============================================
  // ==================================================================

  modalAbierto = false;
  usuarioIdEnEdicion: string | null = null;
  form: UsuarioForm = { ...FORM_VACIO };
  guardando = false;

  get esEdicion(): boolean {
    return !!this.usuarioIdEnEdicion;
  }

  get esMedico(): boolean {
    return this.form.rol === 'MEDICO';
  }

  get tituloModal(): string {
    const etiquetas: Record<Rol, string> = {
      ADMIN: 'administrador',
      MEDICO: 'médico',
      ENFERMERA: 'enfermera',
      RECEPCION: 'personal de recepción'
    };
    const accion = this.esEdicion ? 'Editar' : 'Nuevo';
    return `${accion} ${etiquetas[this.form.rol]}`;
  }

  abrirModalNuevo(): void {
    this.usuarioIdEnEdicion = null;
    this.form = { ...FORM_VACIO };
    this.especialidadSeleccionadaId = null;
    this.subespecialidadSeleccionadaId = null;
    this.subespecialidades = [];
    this.modalAbierto = true;
  }

  abrirModalEditar(usuario: UsuarioResponse): void {
    this.usuarioIdEnEdicion = usuario.id;
    this.form = {
      email: usuario.email,
      password: '',
      nombreCompleto: usuario.nombreCompleto,
      sexo: usuario.sexo ?? '',
      cedulaProfesional: usuario.cedulaProfesional ?? '',
      especialidad: usuario.especialidad ?? '',
      subespecialidad: usuario.subespecialidad ?? '',
      rol: usuario.rol,
      activo: usuario.activo
    };
    this.modalAbierto = true;

    if (usuario.rol === 'MEDICO') {
      this.preseleccionarEspecialidad(usuario.especialidad ?? '', usuario.subespecialidad ?? '');
    }
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  /** Convierte '' (opción "Selecciona...") a undefined para que calce con el tipo del modelo. */
  private normalizarSexo(sexo: Sexo | ''): Sexo | undefined {
    return sexo === '' ? undefined : sexo;
  }

  guardar(): void {
    if (!this.form.email.trim() || !this.form.nombreCompleto.trim()) {
      this.mostrarToast('Correo y nombre completo son obligatorios.', 'error');
      return;
    }

    if (!this.esEdicion && this.form.password.trim().length < 8) {
      this.mostrarToast('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    this.guardando = true;
    this.refrescarVista();

    if (this.esEdicion) {
      const dto: UsuarioUpdateRequest = {
        email: this.form.email.trim(),
        password: this.form.password.trim() ? this.form.password.trim() : null,
        nombreCompleto: this.form.nombreCompleto.trim(),
        sexo: this.normalizarSexo(this.form.sexo),
        cedulaProfesional: this.form.cedulaProfesional.trim(),
        especialidad: this.esMedico ? this.form.especialidad.trim() : '',
        subespecialidad: this.esMedico ? this.form.subespecialidad.trim() : '',
        rol: this.form.rol,
        activo: this.form.activo
      };

      this.usuarioService.actualizar(this.usuarioIdEnEdicion!, dto).subscribe({
        next: () => {
          this.guardando = false;
          this.modalAbierto = false;
          this.mostrarToast('Usuario actualizado con éxito.', 'success');
          this.cargarUsuarios();
        },
        error: (err) => {
          this.guardando = false;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo actualizar el usuario.');
        }
      });
    } else {
      const dto: UsuarioRequest = {
        email: this.form.email.trim(),
        password: this.form.password.trim(),
        nombreCompleto: this.form.nombreCompleto.trim(),
        sexo: this.normalizarSexo(this.form.sexo),
        cedulaProfesional: this.form.cedulaProfesional.trim(),
        especialidad: this.esMedico ? this.form.especialidad.trim() : '',
        subespecialidad: this.esMedico ? this.form.subespecialidad.trim() : '',
        rol: this.form.rol
      };

      this.usuarioService.crear(dto).subscribe({
        next: () => {
          this.guardando = false;
          this.modalAbierto = false;
          this.mostrarToast(`Usuario "${dto.nombreCompleto}" creado con éxito.`, 'success');
          this.cargarUsuarios();
        },
        error: (err) => {
          this.guardando = false;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo crear el usuario.');
        }
      });
    }
  }

  // ==================================================================
  // ===== Baja / reactivación ===========================================
  // ==================================================================

  eliminando: string | null = null;

  darDeBaja(usuario: UsuarioResponse): void {
    Swal.fire({
      title: '¿Dar de baja a este usuario?',
      text: `"${usuario.nombreCompleto}" ya no podrá iniciar sesión. Su historial no se borra.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0604A',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, dar de baja',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then(result => {
      if (!result.isConfirmed) {
        this.refrescarVista();
        return;
      }

      this.eliminando = usuario.id;
      this.refrescarVista();

      this.usuarioService.eliminar(usuario.id).subscribe({
        next: () => {
          this.eliminando = null;
          this.mostrarToast(`"${usuario.nombreCompleto}" fue dado de baja.`, 'success');
          this.cargarUsuarios();
        },
        error: (err) => {
          this.eliminando = null;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo dar de baja al usuario.');
        }
      });
    });
  }

  reactivar(usuario: UsuarioResponse): void {
    const dto: UsuarioUpdateRequest = {
      email: usuario.email,
      password: null,
      nombreCompleto: usuario.nombreCompleto,
      sexo: usuario.sexo,
      cedulaProfesional: usuario.cedulaProfesional ?? '',
      especialidad: usuario.especialidad ?? '',
      subespecialidad: usuario.subespecialidad ?? '',
      rol: usuario.rol,
      activo: true
    };

    this.usuarioService.actualizar(usuario.id, dto).subscribe({
      next: () => {
        this.mostrarToast(`"${usuario.nombreCompleto}" fue reactivado.`, 'success');
        this.cargarUsuarios();
      },
      error: (err) => {
        this.refrescarVista();
        this.mostrarErrorBackend(err, 'No se pudo reactivar al usuario.');
      }
    });
  }

  etiquetaRol(rol: Rol): string {
    const etiquetas: Record<Rol, string> = {
      ADMIN: 'Administrador',
      MEDICO: 'Médico',
      ENFERMERA: 'Enfermera',
      RECEPCION: 'Recepción'
    };
    return etiquetas[rol];
  }

  etiquetaSexo(sexo: Sexo | '' | undefined): string {
    if (sexo === 'M') return 'Masculino';
    if (sexo === 'F') return 'Femenino';
    return '—';
  }
}
