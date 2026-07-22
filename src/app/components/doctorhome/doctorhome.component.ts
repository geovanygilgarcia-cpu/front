import { Component, OnInit, ChangeDetectorRef, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/login/auth.service';
import { AgendaService } from '../../services/agenda.service';
import { PacienteService } from '../../services/paciente.service';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { Cita } from '../../models/cita.model';

@Component({
  selector: 'app-doctor-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctorhome.component.html',
  styleUrl: './doctorhome.component.scss'
})
export class DoctorHomeComponent implements OnInit {

  private authService = inject(AuthService);
  private agendaService = inject(AgendaService);
  private pacienteService = inject(PacienteService);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // El dashboard escucha estos dos eventos para abrir el modal de paciente
  // y para cambiar a la pestaña de agenda (esos flujos viven ahí, no aquí).
  @Output() nuevoPaciente = new EventEmitter<void>();
  @Output() irAAgenda = new EventEmitter<void>();

  fechaHoyTexto = '';
  cargando = true;

  totalPacientes = 0;
  totalMedicos = 0;

  citasHoy: Cita[] = [];
  proximaCita: Cita | null = null;

  get usuario() {
    return this.authService.usuarioActual();
  }

  get esMedico(): boolean {
    return this.usuario?.rol === 'MEDICO';
  }

  get esAdmin(): boolean {
    return this.usuario?.rol === 'ADMIN';
  }

  get saludo(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get tituloUsuario(): string {
    const nombre = this.usuario?.nombreCompleto?.trim() ?? '';
    if (!nombre) return '';
    if (this.usuario?.rol !== 'MEDICO') return nombre;
    if (this.usuario?.sexo === 'F') return `Dra. ${nombre}`;
    if (this.usuario?.sexo === 'M') return `Dr. ${nombre}`;
    return `Dr(a). ${nombre}`;
  }

  get citasPendientesHoy(): number {
    return this.citasHoy.filter(c => c.estado !== 'CANCELADA').length;
  }

  ngOnInit(): void {
    this.fechaHoyTexto = this.capitalizar(
      new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    );
    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.pacienteService.listarTodos().subscribe({
      next: (pacientes) => { this.totalPacientes = pacientes.length; this.refrescarVista(); },
      error: () => { this.refrescarVista(); }
    });

    if (this.esMedico && this.usuario?.id) {
      const medicoId = this.usuario.id;
      const hoy = this.aYyyyMmDd(new Date());

      this.agendaService.listarPorMedico(medicoId, hoy, hoy).subscribe({
        next: (citas) => {
          this.citasHoy = [...citas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
          this.cargando = false;
          this.refrescarVista();
        },
        error: () => { this.cargando = false; this.refrescarVista(); }
      });

      this.agendaService.obtenerProximaCita(medicoId).subscribe({
        next: (cita) => { this.proximaCita = cita; this.refrescarVista(); },
        error: () => { this.refrescarVista(); }
      });
    } else if (this.esAdmin) {
      this.usuarioService.listar('MEDICO').subscribe({
        next: (medicos) => {
          this.totalMedicos = medicos.filter(m => m.activo).length;
          this.cargando = false;
          this.refrescarVista();
        },
        error: () => { this.cargando = false; this.refrescarVista(); }
      });
    } else {
      this.cargando = false;
    }
  }

  irAUsuarios(): void {
    this.router.navigate(['/usuarios']);
  }

  claseEstado(estado: string): string {
    if (estado === 'CONFIRMADA') return 'confirmada';
    if (estado === 'PENDIENTE') return 'pendiente';
    return 'cancelada';
  }

  private refrescarVista(): void {
    this.cdr.markForCheck();
  }

  private capitalizar(txt: string): string {
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  private aYyyyMmDd(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
