import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgendaService } from '../../services/agenda.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { PacienteService } from '../../services/paciente.service';
import { AuthService } from '../../services/login/auth.service';
import { Cita, CitaRequest, EstadoCita, TIPOS_CITA } from '../../models/cita.model';
import { UsuarioResponse } from '../../models/usuarios/usuario.model';
import { Paciente } from '../../models/paciente.model';
import Swal from 'sweetalert2';

type VistaAgenda = 'semana' | 'dia';

interface CitaForm {
  pacienteNombre: string;
  pacienteId: number | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  tipo: string;
  estado: EstadoCita;
  notas: string;
}

const HORA_INICIO_DIA = 8;
const HORA_FIN_DIA = 18;

function vacioForm(fecha: string, hora?: string): CitaForm {
  return {
    pacienteNombre: '',
    pacienteId: null,
    fecha,
    horaInicio: hora ?? '09:00',
    horaFin: hora ? sumarMedia(hora) : '09:30',
    tipo: TIPOS_CITA[0],
    estado: 'PENDIENTE',
    notas: ''
  };
}

function sumarMedia(hora: string): string {
  const [h, m] = hora.split(':').map(Number);
  const total = h * 60 + m + 30;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent implements OnInit {

  private agendaService = inject(AgendaService);
  private usuarioService = inject(UsuarioService);
  private pacienteService = inject(PacienteService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  readonly tiposCita = TIPOS_CITA;
  readonly horas: string[] = Array.from(
    { length: HORA_FIN_DIA - HORA_INICIO_DIA + 1 },
    (_, i) => `${String(HORA_INICIO_DIA + i).padStart(2, '0')}:00`
  );

  vista: VistaAgenda = 'semana';
  fechaReferencia = new Date();
  diasSemana: Date[] = [];

  citas: Cita[] = [];
  cargandoCitas = false;
  errorCitas = '';

  medicos: UsuarioResponse[] = [];
  medicoSeleccionadoId = '';
  medicoSeleccionadoNombre = '';
  cargandoMedicos = false;

  modalAbierto = false;
  citaIdEnEdicion: number | null = null;
  citaForm: CitaForm = vacioForm(this.aYyyyMmDd(new Date()));
  guardandoCita = false;
  eliminandoCita = false;
  errorModal = '';

  toasts: { id: number; tipo: 'success' | 'error'; mensaje: string }[] = [];
  private toastId = 0;

  proximaCita: Cita | null = null;

  pacientes: Paciente[] = [];
  dropdownPacienteAbierto = false;

  get esAdmin(): boolean {
    return this.authService.usuarioActual()?.rol === 'ADMIN';
  }

  get googleConectado(): boolean {
    return this.agendaService.googleCalendarConectado;
  }

  /**
   * Proyecto en modo zoneless (Angular sin zone.js): los callbacks async
   * (HTTP, setTimeout, promesas de SweetAlert2) no disparan detección de
   * cambios automáticamente. Por eso, cada vez que uno de estos callbacks
   * modifica el estado del componente, llamamos a esta función al final
   * (mismo patrón que dashboard.component.ts).
   */
  private refrescarVista(): void {
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.calcularDiasSemana();
    this.cargarPacientes();

    if (this.esAdmin) {
      this.cargarMedicos();
    } else {
      const usuario = this.authService.usuarioActual();
      if (!usuario?.id) {
        this.errorCitas = 'Tu usuario no tiene un id asociado todavía. Pide al administrador que actualice tu cuenta.';
        return;
      }
      this.medicoSeleccionadoId = usuario.id;
      this.medicoSeleccionadoNombre = usuario.nombreCompleto;
      this.cargarCitas();
      this.cargarProximaCita();
    }
  }

  private cargarMedicos(): void {
    this.cargandoMedicos = true;
    this.usuarioService.listar('MEDICO').subscribe({
      next: (medicos) => {
        this.medicos = medicos.filter(m => m.activo);
        this.cargandoMedicos = false;
        if (this.medicos.length > 0) {
          this.medicoSeleccionadoId = this.medicos[0].id;
          this.medicoSeleccionadoNombre = this.medicos[0].nombreCompleto;
          this.cargarCitas();
          this.cargarProximaCita();
        }
        this.refrescarVista();
      },
      error: () => {
        this.cargandoMedicos = false;
        this.mostrarToast('error', 'No se pudo cargar la lista de médicos.');
        this.refrescarVista();
      }
    });
  }

  cambiarMedicoSeleccionado(id: string): void {
    const medico = this.medicos.find(m => m.id === id);
    if (!medico) return;
    this.medicoSeleccionadoId = medico.id;
    this.medicoSeleccionadoNombre = medico.nombreCompleto;
    this.cargarCitas();
    this.cargarProximaCita();
  }

  cargarCitas(): void {
    if (!this.medicoSeleccionadoId || this.diasSemana.length === 0) return;
    this.cargandoCitas = true;
    this.errorCitas = '';
    const desde = this.aYyyyMmDd(this.diasSemana[0]);
    const hasta = this.aYyyyMmDd(this.diasSemana[this.diasSemana.length - 1]);
    this.agendaService.listarPorMedico(this.medicoSeleccionadoId, desde, hasta).subscribe({
      next: (citas) => {
        this.citas = citas;
        this.cargandoCitas = false;
        this.refrescarVista();
      },
      error: () => {
        this.errorCitas = 'No se pudo cargar la agenda.';
        this.cargandoCitas = false;
        this.refrescarVista();
      }
    });
  }

  private cargarProximaCita(): void {
    if (!this.medicoSeleccionadoId) return;
    this.agendaService.obtenerProximaCita(this.medicoSeleccionadoId).subscribe({
      next: (cita) => { this.proximaCita = cita; this.refrescarVista(); },
      error: () => { this.proximaCita = null; this.refrescarVista(); }
    });
  }

  private cargarPacientes(): void {
    this.pacienteService.listarTodos().subscribe({
      next: (pacientes) => { this.pacientes = pacientes; this.refrescarVista(); },
      error: () => { this.pacientes = []; this.refrescarVista(); }
    });
  }

  // ───────────── Navegación de semana ─────────────

  irSemanaAnterior(): void { this.moverSemana(-7); }
  irSemanaSiguiente(): void { this.moverSemana(7); }
  irHoy(): void { this.fechaReferencia = new Date(); this.calcularDiasSemana(); this.cargarCitas(); }

  private moverSemana(dias: number): void {
    const d = new Date(this.fechaReferencia);
    d.setDate(d.getDate() + dias);
    this.fechaReferencia = d;
    this.calcularDiasSemana();
    this.cargarCitas();
  }

  private calcularDiasSemana(): void {
    const lunes = this.lunesDeSemana(this.fechaReferencia);
    this.diasSemana = Array.from({ length: 6 }, (_, i) => this.sumarDias(lunes, i));
  }

  get rangoSemanaTexto(): string {
    if (this.diasSemana.length === 0) return '';
    const ini = this.diasSemana[0];
    const fin = this.diasSemana[this.diasSemana.length - 1];
    const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    const mismmoMes = ini.getMonth() === fin.getMonth();
    const iniTxt = ini.toLocaleDateString('es-MX', mismmoMes ? { day: 'numeric' } : opciones);
    const finTxt = fin.toLocaleDateString('es-MX', { ...opciones, year: 'numeric' });
    return `${iniTxt} – ${finTxt}`;
  }

  etiquetaDia(fecha: Date): string {
    const txt = fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  esHoy(fecha: Date): boolean {
    const hoy = new Date();
    return this.aYyyyMmDd(fecha) === this.aYyyyMmDd(hoy);
  }

  // ───────────── Grilla de citas ─────────────

  citasEnSlot(dia: Date, hora: string): Cita[] {
    const fechaStr = this.aYyyyMmDd(dia);
    const horaBase = hora.split(':')[0];
    return this.citas
      .filter(c => c.fecha === fechaStr && c.horaInicio.split(':')[0] === horaBase)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  claseEstado(estado: EstadoCita): string {
    if (estado === 'CONFIRMADA') return 'confirmada';
    if (estado === 'PENDIENTE') return 'pendiente';
    return 'cancelada';
  }

  // ───────────── Modal: nueva / editar cita ─────────────

  abrirModalNueva(dia?: Date, hora?: string): void {
    this.citaIdEnEdicion = null;
    this.errorModal = '';
    const fecha = dia ? this.aYyyyMmDd(dia) : this.aYyyyMmDd(new Date());
    this.citaForm = vacioForm(fecha, hora);
    this.modalAbierto = true;
  }

  abrirModalEditar(cita: Cita): void {
    this.citaIdEnEdicion = cita.id;
    this.errorModal = '';
    this.citaForm = {
      pacienteNombre: cita.pacienteNombre,
      pacienteId: cita.pacienteId ?? null,
      fecha: cita.fecha,
      horaInicio: cita.horaInicio,
      horaFin: cita.horaFin,
      tipo: cita.tipo,
      estado: cita.estado,
      notas: cita.notas ?? ''
    };
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  // ───────────── Autocompletado de paciente ─────────────

  get pacientesFiltradosParaCita(): Paciente[] {
    const q = this.citaForm.pacienteNombre.trim().toLowerCase();
    const base = q
      ? this.pacientes.filter(p => p.nombreCompleto.toLowerCase().includes(q))
      : this.pacientes;
    return base.slice(0, 8);
  }

  abrirDropdownPaciente(): void {
    this.dropdownPacienteAbierto = true;
  }

  cerrarDropdownPacienteConDelay(): void {
    // El delay deja que (mousedown) de la opción se dispare antes que el blur cierre el panel.
    setTimeout(() => { this.dropdownPacienteAbierto = false; this.refrescarVista(); }, 150);
  }

  onEscribirPaciente(): void {
    // Si el texto ya no calza con el paciente seleccionado, se vuelve "texto libre"
    // (se manda igual al backend, pero sin pacienteId ligado).
    const seleccionado = this.pacientes.find(p => p.id === this.citaForm.pacienteId);
    if (!seleccionado || seleccionado.nombreCompleto !== this.citaForm.pacienteNombre) {
      this.citaForm.pacienteId = null;
    }
  }

  seleccionarPacienteDeLista(paciente: Paciente): void {
    this.citaForm.pacienteNombre = paciente.nombreCompleto;
    this.citaForm.pacienteId = paciente.id;
    this.dropdownPacienteAbierto = false;
  }

  guardarCita(): void {
    if (!this.citaForm.pacienteNombre.trim()) {
      this.errorModal = 'Escribe el nombre del paciente.';
      return;
    }
    if (this.citaForm.horaFin <= this.citaForm.horaInicio) {
      this.errorModal = 'La hora de fin debe ser posterior a la de inicio.';
      return;
    }

    this.errorModal = '';
    this.guardandoCita = true;

    const request: CitaRequest = {
      medicoId: this.medicoSeleccionadoId,
      medicoNombre: this.medicoSeleccionadoNombre,
      pacienteNombre: this.citaForm.pacienteNombre.trim(),
      pacienteId: this.citaForm.pacienteId,
      fecha: this.citaForm.fecha,
      horaInicio: this.citaForm.horaInicio,
      horaFin: this.citaForm.horaFin,
      tipo: this.citaForm.tipo,
      estado: this.citaForm.estado,
      notas: this.citaForm.notas.trim() || null
    };

    const esActualizacion = !!this.citaIdEnEdicion;
    const obs = this.citaIdEnEdicion
      ? this.agendaService.actualizar(this.citaIdEnEdicion, request)
      : this.agendaService.crear(request);

    obs.subscribe({
      next: () => {
        this.guardandoCita = false;
        this.modalAbierto = false;
        this.cargarCitas();
        this.cargarProximaCita();
        this.refrescarVista();

        Swal.fire({
          title: esActualizacion ? '¡Actualizada!' : '¡Agendada!',
          text: esActualizacion ? 'La cita fue actualizada con éxito.' : 'La cita fue agendada con éxito.',
          icon: 'success',
          confirmButtonColor: '#2ecc71',
          confirmButtonText: 'Aceptar',
          timer: 2500,
          timerProgressBar: true
        }).then(() => this.refrescarVista());
      },
      error: (err) => {
        this.guardandoCita = false;
        this.errorModal = 'No se pudo guardar la cita.';
        this.refrescarVista();
        this.mostrarErrorBackend(err, 'No se pudo guardar la cita.');
      }
    });
  }

  eliminarCitaActiva(): void {
    if (!this.citaIdEnEdicion) return;
    const paciente = this.citaForm.pacienteNombre || 'este paciente';

    this.confirmar(
      '¿Eliminar cita?',
      `¿Seguro que quieres eliminar la cita de "${paciente}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar'
    ).then((confirmado) => {
      this.refrescarVista();
      if (!confirmado) return;

      this.eliminandoCita = true;
      this.refrescarVista();

      this.agendaService.eliminar(this.citaIdEnEdicion!).subscribe({
        next: () => {
          this.eliminandoCita = false;
          this.modalAbierto = false;
          this.cargarCitas();
          this.cargarProximaCita();
          this.refrescarVista();

          Swal.fire({
            title: '¡Eliminada!',
            text: `La cita de "${paciente}" fue eliminada con éxito.`,
            icon: 'success',
            confirmButtonColor: '#2ecc71',
            confirmButtonText: 'Aceptar',
            timer: 2500,
            timerProgressBar: true
          }).then(() => this.refrescarVista());
        },
        error: (err) => {
          this.eliminandoCita = false;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo eliminar la cita.');
        }
      });
    });
  }

  /** Confirmación estándar con SweetAlert2 (mismo estilo que el resto del dashboard). */
  private confirmar(titulo: string, texto: string, confirmButtonText = 'Sí, continuar'): Promise<boolean> {
    return Swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#6c757d',
      confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => result.isConfirmed);
  }

  /**
   * Muestra en un Swal el mensaje de error que regresa el backend de citas
   * (CitaExceptionHandler responde { timestamp, status, error, mensaje }).
   */
  private mostrarErrorBackend(err: any, mensajeDefault: string): void {
    const cuerpo = err?.error;
    const detalle =
      (cuerpo?.mensaje && typeof cuerpo.mensaje === 'string' && cuerpo.mensaje) ||
      (cuerpo?.message && typeof cuerpo.message === 'string' && cuerpo.message) ||
      mensajeDefault;

    Swal.fire({
      title: 'No se pudo completar la acción',
      text: detalle,
      icon: 'error',
      confirmButtonColor: '#e74c3c',
      confirmButtonText: 'Aceptar'
    }).then(() => this.refrescarVista());
  }

  // ───────────── Google Calendar (placeholder) ─────────────

  conectarGoogleCalendar(): void {
    this.agendaService.conectarGoogleCalendar().subscribe(() => {
      this.refrescarVista();
      Swal.fire({
        title: 'Casi listo',
        text: 'La conexión con Google Calendar está lista para activarse (próximamente sincronizará automáticamente).',
        icon: 'info',
        confirmButtonColor: '#2F6F6B',
        confirmButtonText: 'Entendido'
      }).then(() => this.refrescarVista());
    });
  }

  // ───────────── Utilidades ─────────────

  private mostrarToast(tipo: 'success' | 'error', mensaje: string): void {
    const id = this.toastId++;
    this.toasts.push({ id, tipo, mensaje });
    setTimeout(() => { this.cerrarToast(id); }, 3800);
  }

  cerrarToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.refrescarVista();
  }

  private lunesDeSemana(fecha: Date): Date {
    const d = new Date(fecha);
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private sumarDias(fecha: Date, dias: number): Date {
    const d = new Date(fecha);
    d.setDate(d.getDate() + dias);
    return d;
  }

  private aYyyyMmDd(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
