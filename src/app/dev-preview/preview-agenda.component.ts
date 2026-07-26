import { Component } from '@angular/core';
import { of } from 'rxjs';
import { DashboardComponent } from '../components/dashboard/dashboard.component';
import { AgendaService } from '../services/agenda.service';
import { UsuarioService } from '../services/usuarios/usuario.service';
import { PacienteService } from '../services/paciente.service';
import { AuthService } from '../services/login/auth.service';
import { RecetaService } from '../services/receta.service';
import { HistorialService } from '../services/historial.service';
import { MedicamentoService } from '../services/medicamentos.service';
import { ReferenciaService } from '../services/referencias.service';
import { Cita } from '../models/cita.model';

function hoyStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CITAS_FAKE: Cita[] = [
  { id: 1, medicoId: 'doc1', medicoNombre: 'Dra. Ejemplo', pacienteNombre: 'Juanito Alimaña', fecha: hoyStr(), horaInicio: '09:00', horaFin: '09:30', tipo: 'Consulta general', estado: 'CONFIRMADA' }
];

class FakeAgendaService {
  googleCalendarConectado = false;
  listarPorMedico() { return of(CITAS_FAKE); }
  obtenerProximaCita() { return of(CITAS_FAKE[0]); }
  crear(req: any) { return of({ ...req, id: 99 }); }
  actualizar(id: number, req: any) { return of({ ...req, id }); }
  eliminar() { return of(void 0); }
  conectarGoogleCalendar() { this.googleCalendarConectado = true; return of({ conectado: true }); }
}

class FakeUsuarioService {
  listar() { return of([{ id: 'doc1', email: 'a@a.com', nombreCompleto: 'Dra. Ejemplo', especialidad: 'Medicina general', rol: 'MEDICO', activo: true }]); }
}

const PACIENTES_FAKE = [
  { id: 1, expediente: '0014', nombreCompleto: 'Juanito Alimaña', edad: 23, iniciales: 'JA', telefono: '', fechaNacimiento: '', email: '', genero: '', contactoEmergencia: '', medicoId: null, medicoNombre: null, createdAt: '' },
  { id: 2, expediente: '0015', nombreCompleto: 'Geovany Navajas Lopez Mateos', edad: 25, iniciales: 'GN', telefono: '', fechaNacimiento: '', email: '', genero: '', contactoEmergencia: '', medicoId: null, medicoNombre: null, createdAt: '' }
];

class FakePacienteService {
  listarTodos() { return of(PACIENTES_FAKE as any); }
  eliminar() { return of(void 0); }
  crear(req: any) { return of({ ...req, id: 3 } as any); }
  actualizar(id: number, req: any) { return of({ ...req, id } as any); }
}

class FakeAuthService {
  usuarioActual = () => ({ id: 'doc1', nombreCompleto: 'Dra. Ejemplo', rol: 'MEDICO' } as any);
}

class FakeRecetaService {
  listarPorPaciente() { return of([]); }
}

class FakeHistorialService {
  listarPorPaciente() { return of([]); }
}

class FakeMedicamentoService {
  listarTodos() { return of([]); }
}

class FakeReferenciaService {
  listarPendientes() { return of([]); }
}

@Component({
  selector: 'app-preview-agenda',
  standalone: true,
  imports: [DashboardComponent],
  template: `<app-dashboard></app-dashboard>`,
  providers: [
    { provide: AgendaService, useClass: FakeAgendaService },
    { provide: UsuarioService, useClass: FakeUsuarioService },
    { provide: PacienteService, useClass: FakePacienteService },
    { provide: AuthService, useClass: FakeAuthService },
    { provide: RecetaService, useClass: FakeRecetaService },
    { provide: HistorialService, useClass: FakeHistorialService },
    { provide: MedicamentoService, useClass: FakeMedicamentoService },
    { provide: ReferenciaService, useClass: FakeReferenciaService }
  ]
})
export class PreviewAgendaComponent {}
