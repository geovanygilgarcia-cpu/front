import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PdfService } from '../../services/pdf.service';
import { PacienteService } from '../../services/paciente.service';
import { Paciente, PacienteRequest } from '../../models/paciente.model';
import { RecetaService } from '../../services/receta.service';
import { RecetaDTO, RecetaResponseDTO } from '../../models/receta.model';
import { HistorialService } from '../../services/historial.service';
import { PatientIntakeFormDTO, HistoriaClinicaResponseDTO } from '../../models/historial.model';
import { MedicamentoService } from '../../services/medicamentos.service';
import { Medicamento } from '../../models/medicamento.model';
import { AuthService } from '../../services/login/auth.service';
import { UsuarioSesion } from '../../models/login/auth.model';
import { UsuarioService } from '../../services/usuarios/usuario.service';
import { UsuarioResponse } from '../../models/usuarios/usuario.model';
import { ReferenciaService } from '../../services/referencias.service';
import { ReferenciaRequest, ReferenciaResponse } from '../../models/referencia.model';
import Swal from 'sweetalert2';

type TabId = 'historia' | 'consultas' | 'recetas';
type ToastTipo = 'success' | 'error';
type RecetaAlergiasOpcion = 'SI' | 'NO';

interface Toast {
  id: number;
  tipo: ToastTipo;
  mensaje: string;
}

interface MedicamentoLinea {
  medicamento: string;
  indicacion: string;
}

interface RecetaForm {
  folio: string;
  paciente: string;
  edad: string;
  fecha: string; // yyyy-MM-dd
  peso: string;
  talla: string;
  ta: string;
  fc: string;
  fr: string;
  temp: string;
  sato2: string;
  imc: string;
  alergias: string;
  idx: string;
  proximaCita: string; // yyyy-MM-dd
  firma: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {

  private pacienteService = inject(PacienteService);
  private recetaService = inject(RecetaService);
  private historialService = inject(HistorialService);
  private cdr = inject(ChangeDetectorRef);
  private pdfService = inject(PdfService);
  private medicamentoService = inject(MedicamentoService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private referenciaService = inject(ReferenciaService);
  private router = inject(Router);

  ngOnInit(): void {
    this.cargarPacientes();
    this.cargarCatalogoMedicamentos();
    this.receta.firma = this.medicoActual;
    this.cargarReferenciasPendientes();
  }

  /**
   * Proyecto en modo zoneless (Angular 22, sin zone.js): los callbacks async
   * (HTTP, setTimeout, promesas de SweetAlert2) no disparan detección de
   * cambios automáticamente. Por eso, cada vez que uno de estos callbacks
   * modifica el estado del componente, llamamos a esta función al final.
   */
  private refrescarVista(): void {
    this.cdr.markForCheck();
  }

  // ==================================================================
  // ===== SESIÓN — usuario actual y logout =============================
  // ==================================================================

  get usuarioActual(): UsuarioSesion | null {
    return this.authService.usuarioActual();
  }

  get inicialesUsuarioActual(): string {
    const nombre = this.usuarioActual?.nombreCompleto?.trim();
    if (!nombre) return '—';
    const partes = nombre.split(/\s+/).filter(Boolean);
    const iniciales = partes.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
    return iniciales || '—';
  }

  get etiquetaRolActual(): string {
    const etiquetas: Record<string, string> = {
      ADMIN: 'Administrador',
      MEDICO: 'Médico',
      ENFERMERA: 'Enfermería',
      RECEPCION: 'Recepción'
    };
    const rol = this.usuarioActual?.rol;
    return rol ? (etiquetas[rol] ?? rol) : '';
  }

  /**
   * Devuelve "Dr. Nombre" / "Dra. Nombre" para médicos (según su sexo),
   * o simplemente el nombre completo para el resto de roles.
   */
  get tituloUsuarioActual(): string {
    const usuario = this.usuarioActual;
    if (!usuario) return '';

    const nombre = usuario.nombreCompleto ?? '';

    if (usuario.rol !== 'MEDICO') {
      return nombre;
    }

    if (usuario.sexo === 'F') {
      return `Dra. ${nombre}`;
    }
    if (usuario.sexo === 'M') {
      return `Dr. ${nombre}`;
    }
    // Sin sexo registrado: usamos la forma neutra "Dr(a)."
    return `Dr(a). ${nombre}`;
  }

  irAUsuarios(): void {
    this.router.navigate(['/usuarios']);
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
  // ===== TOASTS — notificaciones flotantes ============================
  // ==================================================================

  toasts: Toast[] = [];
  private toastIdCounter = 0;

  mostrarToast(mensaje: string, tipo: ToastTipo = 'success'): void {
    const id = ++this.toastIdCounter;
    this.toasts.push({ id, tipo, mensaje });
    this.refrescarVista();
    setTimeout(() => {
      this.cerrarToast(id);
      this.refrescarVista();
    }, 3500);
  }

  cerrarToast(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.refrescarVista();
  }

  // ---- Helper genérico de confirmación con SweetAlert2 ----

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
    }).then(result => result.isConfirmed);
  }

  /**
   * Muestra en un Swal los errores que regresa el backend. Soporta el formato
   * { error: "mensaje general", campos: { "campo": "detalle" } } y también
   * mensajes de error simples si el backend responde distinto.
   */
  private mostrarErrorBackend(err: any, mensajeDefault: string): void {
    const cuerpo = err?.error;
    let html = '';

    if (cuerpo?.error && typeof cuerpo.error === 'string') {
      html += `<p style="margin:0 0 8px;">${cuerpo.error}</p>`;
    }

    if (cuerpo?.campos && typeof cuerpo.campos === 'object') {
      const items = Object.entries(cuerpo.campos)
        .map(([campo, mensaje]) => `<li><b>${campo}</b>: ${mensaje}</li>`)
        .join('');
      html += `<ul style="text-align:left; margin:0; padding-left:18px;">${items}</ul>`;
    }

    if (!html && cuerpo?.message && typeof cuerpo.message === 'string') {
      html = `<p style="margin:0;">${cuerpo.message}</p>`;
    }

    Swal.fire({
      title: 'No se pudo guardar',
      html: html || mensajeDefault,
      icon: 'error',
      confirmButtonColor: '#e74c3c',
      confirmButtonText: 'Aceptar'
    }).then(() => this.refrescarVista());
  }

  // ---- Navegación ----

  tabActivo: TabId = 'historia';
  filtroPaciente = '';

  // ==================================================================
  // ===== PACIENTES (sidebar) ==========================================
  // ==================================================================

  pacientes: Paciente[] = [];
  cargandoPacientes = true;
  errorPacientes = '';

  pacienteActivoId: number | null = null;

  get pacienteActivo(): Paciente | undefined {
    return this.pacientes.find(p => p.id === this.pacienteActivoId);
  }

  get pacientesFiltrados(): Paciente[] {
    const q = this.filtroPaciente.trim().toLowerCase();
    if (!q) return this.pacientes;
    return this.pacientes.filter(p =>
      p.nombreCompleto.toLowerCase().includes(q) || p.expediente.includes(q)
    );
  }

  cargarPacientes(): void {
    this.cargandoPacientes = true;
    this.errorPacientes = '';

    this.pacienteService.listarTodos().subscribe({
      next: (data: Paciente[]) => {
        this.pacientes = data;
        this.cargandoPacientes = false;
        this.refrescarVista();
      },
      error: (err: any) => {
        this.errorPacientes = 'No se pudo cargar la lista de pacientes.';
        this.cargandoPacientes = false;
        console.error(err);
        this.refrescarVista();
      }
    });
  }

  seleccionarTab(tab: TabId): void {
    this.tabActivo = tab;
  }

  seleccionarPaciente(id: number): void {
    this.pacienteActivoId = id;

    const paciente = this.pacientes.find(p => p.id === id);
    if (paciente) {
      this.pacienteIdEnEdicion = paciente.id;
      this.pacienteNuevo = {
        expediente: this.formatExpediente(paciente.id),
        nombreCompleto: paciente.nombreCompleto,
        telefono: paciente.telefono ?? '',
        fechaNacimiento: paciente.fechaNacimiento ?? '',
        email: paciente.email ?? '',
        genero: paciente.genero ?? '',
        contactoEmergencia: paciente.contactoEmergencia ?? ''
      };
      this.sincronizarInfoPacienteEnHistorial(paciente);
    }

    this.cargarHistorialExistente(id);
    this.cargarRecetaExistente(id);
  }

  toggleChip(event: Event): void {
    (event.target as HTMLElement).classList.toggle('on');
  }

  formatExpediente(id: number): string {
    return String(id).padStart(4, '0');
  }

  formatFolio(id: number): string {
    return String(id).padStart(4, '0');
  }

  // ==================================================================
  // ===== MODAL PACIENTE — crear (POST), editar (PUT) o eliminar ======
  // ==================================================================

  modalPacienteAbierto = false;

  pacienteNuevo: PacienteRequest = {
    expediente: '',
    nombreCompleto: '',
    telefono: '',
    fechaNacimiento: '',
    email: '',
    genero: '',
    contactoEmergencia: ''
  };

  pacienteIdEnEdicion: number | null = null;

  guardandoPaciente = false;
  eliminandoPaciente = false;
  errorPaciente = '';
  exitoPaciente = '';

  abrirModalNuevoPaciente(): void {
    this.limpiarFormularioPaciente();
    this.modalPacienteAbierto = true;
  }

  abrirModalEditarPaciente(): void {
    this.errorPaciente = '';
    this.exitoPaciente = '';
    this.modalPacienteAbierto = true;
  }

  cerrarModalPaciente(): void {
    this.modalPacienteAbierto = false;
  }

  guardarPacienteNuevo(): void {
    this.errorPaciente = '';
    this.exitoPaciente = '';

    if (!this.pacienteNuevo.nombreCompleto.trim()) {
      this.errorPaciente = 'El nombre completo es obligatorio.';
      return;
    }

    const esActualizacion = !!this.pacienteIdEnEdicion;

    const titulo = esActualizacion ? '¿Actualizar paciente?' : '¿Guardar paciente?';
    const texto = esActualizacion
      ? `Se actualizarán los datos de "${this.pacienteNuevo.nombreCompleto}".`
      : `Se creará un nuevo paciente: "${this.pacienteNuevo.nombreCompleto}".`;
    const boton = esActualizacion ? 'Sí, actualizar' : 'Sí, guardar';

    this.confirmar(titulo, texto, boton).then(confirmado => {
      if (!confirmado) return;

      this.guardandoPaciente = true;
      this.refrescarVista();

      const peticion$ = this.pacienteIdEnEdicion
        ? this.pacienteService.actualizar(this.pacienteIdEnEdicion, this.pacienteNuevo)
        : this.pacienteService.crear(this.pacienteNuevo);

      peticion$.subscribe({
        next: (guardado) => {
          this.guardandoPaciente = false;

          const idResultante = guardado?.id ?? this.pacienteIdEnEdicion;
          const nombreResultante = guardado?.nombreCompleto ?? this.pacienteNuevo.nombreCompleto;

          this.pacienteIdEnEdicion = idResultante;
          this.exitoPaciente = esActualizacion
            ? `Paciente "${nombreResultante}" actualizado con éxito.`
            : `Paciente "${nombreResultante}" guardado con éxito.`;
          this.modalPacienteAbierto = false;

          if (!esActualizacion && idResultante) {
            const expedienteCalculado = this.formatExpediente(idResultante);
            this.pacienteService.actualizar(idResultante, {
              ...this.pacienteNuevo,
              expediente: expedienteCalculado
            }).subscribe({
              next: () => {
                this.cargarPacientes();
                this.refrescarVista();
              },
              error: (err) => {
                console.error('No se pudo asignar el expediente automático:', err);
                this.cargarPacientes();
                this.refrescarVista();
              }
            });
          } else {
            this.cargarPacientes();
          }
          this.refrescarVista();

          Swal.fire({
            title: esActualizacion ? '¡Actualizado!' : '¡Guardado!',
            text: this.exitoPaciente,
            icon: 'success',
            confirmButtonColor: '#2ecc71',
            confirmButtonText: 'Aceptar',
            timer: 2500,
            timerProgressBar: true
          }).then(() => this.refrescarVista());
        },
        error: (err) => {
          this.guardandoPaciente = false;
          this.errorPaciente = 'No se pudo guardar el paciente.';
          this.refrescarVista();

          Swal.fire({
            title: 'Error',
            text: 'No se pudo guardar el paciente.',
            icon: 'error',
            confirmButtonColor: '#e74c3c',
            confirmButtonText: 'Aceptar'
          }).then(() => this.refrescarVista());
          console.error(err);
        }
      });
    });
  }

eliminarPacienteActivo(): void {
  if (!this.pacienteActivoId) return;

  const paciente = this.pacienteActivo;
  const nombre = paciente ? paciente.nombreCompleto : 'este paciente';

  this.confirmar(
    '¿Eliminar paciente?',
    `¿Seguro que quieres eliminar a "${nombre}"? Esta acción también eliminará su historia clínica y todas sus recetas guardadas. Esta acción no se puede deshacer.`,
    'Sí, eliminar todo'
  ).then(confirmado => {
    if (!confirmado) return;

    this.eliminandoPaciente = true;
    this.refrescarVista();

    this.pacienteService.eliminar(this.pacienteActivoId!).subscribe({
      next: () => {
        this.eliminandoPaciente = false;
        this.pacienteActivoId = null;
        this.limpiarFormularioPaciente();
        this.cargarPacientes();
        this.mostrarToast(`Paciente "${nombre}" y su expediente completo fueron eliminados.`, 'success');
        this.refrescarVista();
      },
      error: (err) => {
        this.eliminandoPaciente = false;
        this.mostrarToast('No se pudo eliminar el paciente.', 'error');
        this.refrescarVista();
        console.error(err);
      }
    });
  });
}

  limpiarFormularioPaciente(): void {
    this.pacienteNuevo = {
      expediente: '',
      nombreCompleto: '',
      telefono: '',
      fechaNacimiento: '',
      email: '',
      genero: '',
      contactoEmergencia: ''
    };
    this.pacienteIdEnEdicion = null;
    this.errorPaciente = '';
    this.exitoPaciente = '';
  }

  private sincronizarInfoPacienteEnHistorial(paciente: Paciente): void {
    this.historial.patientInformation = {
      fullName: paciente.nombreCompleto,
      phone: paciente.telefono ?? '',
      dateOfBirth: paciente.fechaNacimiento ?? '',
      email: paciente.email ?? '',
      gender: (paciente.genero as any) || 'FEMALE',
      emergencyContact: paciente.contactoEmergencia ?? ''
    };
  }

  get infoPacienteBloqueada(): boolean {
    return !!this.pacienteActivoId;
  }

  // ==================================================================
  // ===== REFERENCIAS — referir paciente a otro médico =================
  // ==================================================================

  /** Catálogo de médicos activos disponibles para referir (se carga bajo demanda). */
  medicosDisponibles: UsuarioResponse[] = [];
  cargandoMedicosDisponibles = false;

  modalReferenciaAbierto = false;
  referenciaForm = {
    medicoDestinoId: '',
    motivo: ''
  };
  guardandoReferencia = false;
  errorReferencia = '';

  abrirModalReferencia(): void {
    if (!this.pacienteActivoId) return;

    this.referenciaForm = { medicoDestinoId: '', motivo: '' };
    this.errorReferencia = '';
    this.modalReferenciaAbierto = true;

    if (this.medicosDisponibles.length === 0) {
      this.cargarMedicosDisponibles();
    }
  }

  cerrarModalReferencia(): void {
    this.modalReferenciaAbierto = false;
  }

  private cargarMedicosDisponibles(): void {
    this.cargandoMedicosDisponibles = true;
    this.refrescarVista();

    this.usuarioService.listar('MEDICO').subscribe({
      next: (data: UsuarioResponse[]) => {
        this.medicosDisponibles = data.filter(u => u.activo);
        this.cargandoMedicosDisponibles = false;
        this.refrescarVista();
      },
      error: (err: any) => {
        this.cargandoMedicosDisponibles = false;
        this.errorReferencia = 'No se pudo cargar la lista de médicos.';
        console.error(err);
        this.refrescarVista();
      }
    });
  }

  guardarReferencia(): void {
    this.errorReferencia = '';

    if (!this.pacienteActivoId || !this.pacienteActivo) {
      this.errorReferencia = 'Selecciona un paciente antes de referirlo.';
      return;
    }

    if (!this.referenciaForm.medicoDestinoId) {
      this.errorReferencia = 'Selecciona a qué médico quieres referir al paciente.';
      return;
    }

    const medicoDestino = this.medicosDisponibles.find(
      m => m.id === this.referenciaForm.medicoDestinoId
    );
    if (!medicoDestino) {
      this.errorReferencia = 'El médico seleccionado ya no está disponible.';
      return;
    }

    const nombrePaciente = this.pacienteActivo.nombreCompleto;
    const nombreMedico = medicoDestino.nombreCompleto;

    this.confirmar(
      '¿Referir paciente?',
      `Se enviará una referencia de "${nombrePaciente}" a "${nombreMedico}". El médico deberá aceptarla para que el paciente pase a su cuidado.`,
      'Sí, referir'
    ).then(confirmado => {
      if (!confirmado) return;

      this.guardandoReferencia = true;
      this.refrescarVista();

      const dto: ReferenciaRequest = {
        pacienteId: this.pacienteActivoId!,
        medicoDestinoId: medicoDestino.id,
        medicoDestinoNombre: medicoDestino.nombreCompleto,
        motivo: this.referenciaForm.motivo.trim() || undefined
      };

      this.referenciaService.crear(dto).subscribe({
        next: () => {
          this.guardandoReferencia = false;
          this.modalReferenciaAbierto = false;
          this.mostrarToast(`Paciente referido a "${nombreMedico}". Queda pendiente de su aceptación.`, 'success');
          this.refrescarVista();
        },
        error: (err) => {
          this.guardandoReferencia = false;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo referir al paciente.');
          console.error(err);
        }
      });
    });
  }

  // ---- Notificaciones: referencias pendientes dirigidas a mí ----

  referenciasPendientes: ReferenciaResponse[] = [];
  panelNotificacionesAbierto = false;
  resolviendoReferenciaId: number | null = null;

  cargarReferenciasPendientes(): void {
    this.referenciaService.listarPendientes().subscribe({
      next: (data: ReferenciaResponse[]) => {
        this.referenciasPendientes = data;
        this.refrescarVista();
      },
      error: (err: any) => {
        console.error('No se pudo cargar las referencias pendientes:', err);
      }
    });
  }

  toggleNotificaciones(): void {
    this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto;
  }

  aceptarReferencia(r: ReferenciaResponse): void {
    this.confirmar(
      '¿Aceptar referencia?',
      `"${r.pacienteNombre}" pasará a ser tu paciente. Dejará de aparecer en la lista de "${r.medicoOrigenNombre}".`,
      'Sí, aceptar'
    ).then(confirmado => {
      if (!confirmado) return;

      this.resolviendoReferenciaId = r.id;
      this.refrescarVista();

      this.referenciaService.aceptar(r.id).subscribe({
        next: () => {
          this.resolviendoReferenciaId = null;
          this.referenciasPendientes = this.referenciasPendientes.filter(x => x.id !== r.id);
          this.mostrarToast(`"${r.pacienteNombre}" ahora es tu paciente.`, 'success');
          this.cargarPacientes();
          this.refrescarVista();
        },
        error: (err) => {
          this.resolviendoReferenciaId = null;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo aceptar la referencia.');
          console.error(err);
        }
      });
    });
  }

  rechazarReferencia(r: ReferenciaResponse): void {
    this.confirmar(
      '¿Rechazar referencia?',
      `"${r.pacienteNombre}" se quedará con "${r.medicoOrigenNombre}".`,
      'Sí, rechazar'
    ).then(confirmado => {
      if (!confirmado) return;

      this.resolviendoReferenciaId = r.id;
      this.refrescarVista();

      this.referenciaService.rechazar(r.id).subscribe({
        next: () => {
          this.resolviendoReferenciaId = null;
          this.referenciasPendientes = this.referenciasPendientes.filter(x => x.id !== r.id);
          this.mostrarToast('Referencia rechazada.', 'success');
          this.refrescarVista();
        },
        error: (err) => {
          this.resolviendoReferenciaId = null;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo rechazar la referencia.');
          console.error(err);
        }
      });
    });
  }

  // ==================================================================
  // ===== CATÁLOGO DE MEDICAMENTOS (autocomplete personalizado) ========
  // ==================================================================

  catalogoMedicamentos: Medicamento[] = [];

  /** Índice de la fila de medicamento cuyo panel de sugerencias está abierto (null = ninguno). */
  medicamentoDropdownAbiertoIndex: number | null = null;

  cargarCatalogoMedicamentos(): void {
    this.medicamentoService.listarTodos().subscribe({
      next: (data: Medicamento[]) => {
        this.catalogoMedicamentos = data;
        this.refrescarVista();
      },
      error: (err: any) => {
        console.error('No se pudo cargar el catálogo de medicamentos:', err);
      }
    });
  }

  /** Filtra el catálogo según lo escrito en la fila `index`. Si está vacío, muestra los primeros 8 como sugerencia general. */
  filtrarCatalogoPara(index: number): Medicamento[] {
    const texto = (this.medicamentos[index]?.medicamento || '').trim().toLowerCase();
    if (!texto) return this.catalogoMedicamentos.slice(0, 8);
    return this.catalogoMedicamentos
      .filter(m => m.medicamento.toLowerCase().includes(texto))
      .slice(0, 8);
  }

  abrirDropdownMedicamento(index: number): void {
    this.medicamentoDropdownAbiertoIndex = index;
    this.refrescarVista();
  }

  /** Pequeño delay antes de cerrar, para que el (mousedown) de la opción alcance a dispararse antes del (blur). */
  cerrarDropdownMedicamentoConDelay(): void {
    setTimeout(() => {
      this.medicamentoDropdownAbiertoIndex = null;
      this.refrescarVista();
    }, 150);
  }

  seleccionarMedicamentoDeCatalogo(index: number, m: Medicamento): void {
    this.medicamentos[index].medicamento = m.medicamento;
    this.medicamentos[index].indicacion = m.indicacion;
    this.medicamentoDropdownAbiertoIndex = null;
    this.refrescarVista();
  }

  // ==================================================================
  // ===== RECETA — conectada a POST/PUT /api/recetas ===================
  // ==================================================================

  /**
   * Nombre del médico que expide la receta, tomado del usuario logueado
   * en el momento de generarla ("Dr. Nombre" / "Dra. Nombre" según su sexo).
   */
  get medicoActual(): string {
    return this.tituloUsuarioActual;
  }

  receta: RecetaForm = {
    folio: '',
    paciente: '',
    edad: '',
    fecha: '',
    peso: '',
    talla: '',
    ta: '',
    fc: '',
    fr: '',
    temp: '',
    sato2: '',
    imc: '',
    alergias: '',
    idx: '',
    proximaCita: '',
    firma: ''
  };
  recetaAlergiasOpcion: RecetaAlergiasOpcion = 'NO';

  medicamentos: MedicamentoLinea[] = [
    { medicamento: '', indicacion: '' }
  ];

  marcarAlergiasReceta(opcion: RecetaAlergiasOpcion): void {
    this.recetaAlergiasOpcion = opcion;
    if (opcion === 'NO') {
      this.receta.alergias = 'Ninguna conocida';
    } else if (this.receta.alergias === 'Ninguna conocida') {
      this.receta.alergias = '';
    }
    this.refrescarVista();
  }

  private sincronizarOpcionAlergiasReceta(): void {
    const alergias = this.receta.alergias.trim();
    this.recetaAlergiasOpcion = alergias && alergias !== 'Ninguna conocida' ? 'SI' : 'NO';
    if (this.recetaAlergiasOpcion === 'NO') {
      this.receta.alergias = 'Ninguna conocida';
    }
  }

  agregarMedicamento(): void {
    this.medicamentos.push({ medicamento: '', indicacion: '' });
  }

  quitarMedicamento(index: number): void {
    this.medicamentos.splice(index, 1);
  }

  recetaIdGuardada: number | null = null;
  guardandoReceta = false;
  eliminandoReceta = false;
  errorReceta = '';
  exitoReceta = '';

  recetasPaciente: RecetaResponseDTO[] = [];

  cargarRecetaExistente(pacienteId: number): void {
    this.recetaService.listarPorPaciente(pacienteId).subscribe({
      next: (data) => {
        this.recetasPaciente = data;
        if (data.length > 0) {
          this.cargarRecetaEnFormulario(data[0]);
        } else {
          this.reiniciarFormularioRecetaVacio();
        }
        this.refrescarVista();
      },
      error: (err) => {
        console.error(err);
        this.recetasPaciente = [];
        this.reiniciarFormularioRecetaVacio();
        this.refrescarVista();
      }
    });
  }

  seleccionarReceta(id: number): void {
    const receta = this.recetasPaciente.find(r => r.id === id);
    if (!receta) return;
    this.cargarRecetaEnFormulario(receta);
    this.refrescarVista();
  }

  nuevaReceta(): void {
    this.reiniciarFormularioRecetaVacio();
    this.refrescarVista();
  }

  eliminarRecetaActiva(): void {
    if (!this.recetaIdGuardada) return;

    const folio = this.receta.folio || 'sin folio';

    this.confirmar(
      '¿Eliminar receta?',
      `¿Seguro que quieres eliminar la receta con folio "${folio}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar'
    ).then(confirmado => {
      if (!confirmado) return;

      this.eliminandoReceta = true;
      this.refrescarVista();

      this.recetaService.eliminar(this.recetaIdGuardada!).subscribe({
        next: () => {
          this.eliminandoReceta = false;
          this.recetasPaciente = this.recetasPaciente.filter(r => r.id !== this.recetaIdGuardada);
          this.reiniciarFormularioRecetaVacio();
          this.refrescarVista();

          Swal.fire({
            title: '¡Eliminada!',
            text: `La receta con folio "${folio}" fue eliminada con éxito.`,
            icon: 'success',
            confirmButtonColor: '#2ecc71',
            confirmButtonText: 'Aceptar',
            timer: 2500,
            timerProgressBar: true
          }).then(() => this.refrescarVista());
        },
        error: (err) => {
          this.eliminandoReceta = false;
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo eliminar la receta.');
          console.error(err);
        }
      });
    });
  }

  private cargarRecetaEnFormulario(r: RecetaResponseDTO): void {
    this.recetaIdGuardada = r.id;
    this.receta = {
      folio: r.folio,
      paciente: r.paciente,
      edad: r.edad,
      fecha: r.fecha ? `${r.fecha.anio}-${r.fecha.mes}-${r.fecha.dia}` : '',
      peso: r.signosVitales?.peso ?? '',
      talla: r.signosVitales?.talla ?? '',
      ta: r.signosVitales?.ta ?? '',
      fc: r.signosVitales?.fc ?? '',
      fr: r.signosVitales?.fr ?? '',
      temp: r.signosVitales?.temp ?? '',
      sato2: r.signosVitales?.sato2 ?? '',
      imc: r.signosVitales?.imc ?? '',
      alergias: r.signosVitales?.alergias ?? '',
      idx: r.idx,
      proximaCita: this.convertirFechaDDMMYYYYaISO(r.proximaCita),
      firma: this.medicoActual
    };
    this.medicamentos = r.diagnosticoTratamiento
      ? r.diagnosticoTratamiento.split('\n').filter(l => l.trim()).map(linea => {
          const [medicamento, indicacion] = linea.split(' — ');
          return { medicamento: medicamento ?? '', indicacion: indicacion ?? '' };
        })
      : [{ medicamento: '', indicacion: '' }];
    this.sincronizarOpcionAlergiasReceta();
    this.errorReceta = '';
    this.exitoReceta = '';
  }

  private reiniciarFormularioRecetaVacio(): void {
    this.recetaIdGuardada = null;
    this.errorReceta = '';
    this.exitoReceta = '';
    this.receta = {
      folio: '',
      paciente: this.pacienteActivo?.nombreCompleto ?? '',
      edad: this.pacienteActivo?.edad != null ? String(this.pacienteActivo.edad) : '',
      fecha: '',
      peso: '', talla: '', ta: '', fc: '', fr: '', temp: '', sato2: '', imc: '', alergias: 'Ninguna conocida',
      idx: '', proximaCita: '', firma: this.medicoActual
    };
    this.recetaAlergiasOpcion = 'NO';
    this.medicamentos = [{ medicamento: '', indicacion: '' }];
  }

  private convertirFechaDDMMYYYYaISO(fecha: string): string {
    if (!fecha) return '';
    const [dia, mes, anio] = fecha.split('/');
    return `${anio}-${mes}-${dia}`;
  }

  guardarReceta(): void {
    this.errorReceta = '';
    this.exitoReceta = '';

    if (!this.pacienteActivoId) {
      this.errorReceta = 'Selecciona un paciente antes de guardar la receta.';
      return;
    }

    if (!this.receta.paciente.trim()) {
      this.errorReceta = 'No se pudo determinar el paciente para la receta.';
      return;
    }

    if (!this.receta.fecha) {
      this.errorReceta = 'La fecha de la receta es obligatoria.';
      Swal.fire({
        title: 'Falta la fecha',
        text: 'Selecciona la fecha de la receta antes de guardar (el campo "Fecha" en Datos generales).',
        icon: 'warning',
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Entendido'
      }).then(() => this.refrescarVista());
      return;
    }

    const esActualizacion = !!this.recetaIdGuardada;

    const titulo = esActualizacion ? '¿Actualizar receta?' : '¿Guardar receta?';
    const texto = esActualizacion
      ? `Se actualizará la receta con folio "${this.receta.folio}" de "${this.receta.paciente}".`
      : `Se guardará una nueva receta con folio "${this.receta.folio}" para "${this.receta.paciente}".`;
    const boton = esActualizacion ? 'Sí, actualizar' : 'Sí, guardar';

    this.confirmar(titulo, texto, boton).then(confirmado => {
      if (!confirmado) return;

      this.guardandoReceta = true;
      this.refrescarVista();

      const dto = this.construirRecetaDto();

      const peticion$ = this.recetaIdGuardada
        ? this.recetaService.actualizar(this.recetaIdGuardada, dto)
        : this.recetaService.crear(dto);

      peticion$.subscribe({
        next: (response) => {
          this.guardandoReceta = false;
          this.recetaIdGuardada = response.id;
          this.exitoReceta = esActualizacion ? 'Receta actualizada con éxito.' : 'Receta guardada con éxito.';
          this.mostrarToast(this.exitoReceta, 'success');

          const idx = this.recetasPaciente.findIndex(r => r.id === response.id);
          if (idx !== -1) {
            this.recetasPaciente[idx] = response;
          } else {
            this.recetasPaciente = [response, ...this.recetasPaciente];
          }

          if (!esActualizacion && response.id) {
            const folioCalculado = this.formatFolio(response.id);
            const dtoConFolio: RecetaDTO = { ...dto, folio: folioCalculado };
            this.recetaService.actualizar(response.id, dtoConFolio).subscribe({
              next: (actualizada) => {
                this.receta.folio = folioCalculado;
                const idx2 = this.recetasPaciente.findIndex(r => r.id === actualizada.id);
                if (idx2 !== -1) this.recetasPaciente[idx2] = actualizada;
                this.refrescarVista();
              },
              error: (err) => {
                console.error('No se pudo asignar el folio automático:', err);
                this.refrescarVista();
              }
            });
          }

          this.refrescarVista();

          Swal.fire({
            title: esActualizacion ? '¡Actualizada!' : '¡Guardada!',
            text: this.exitoReceta,
            icon: 'success',
            confirmButtonColor: '#2ecc71',
            confirmButtonText: 'Aceptar',
            timer: 2500,
            timerProgressBar: true
          }).then(() => this.refrescarVista());
        },
        error: (err) => {
          this.guardandoReceta = false;
          this.errorReceta = 'No se pudo guardar la receta.';
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo guardar la receta. Verifica los datos e intenta de nuevo.');
          console.error(err);
        }
      });
    });
  }

  private formatearFechaDDMMYYYY(fechaISO: string): string {
    if (!fechaISO) return '';
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private construirRecetaDto(): RecetaDTO {
    const [anio, mes, dia] = this.receta.fecha
      ? this.receta.fecha.split('-')
      : ['', '', ''];

    return {
      pacienteId: this.pacienteActivoId!,
      folio: this.receta.folio,
      paciente: this.receta.paciente,
      edad: this.receta.edad,
      fecha: { dia, mes, anio },
      signosVitales: {
        peso: this.receta.peso,
        talla: this.receta.talla,
        ta: this.receta.ta,
        fc: this.receta.fc,
        fr: this.receta.fr,
        temp: this.receta.temp,
        sato2: this.receta.sato2,
        imc: this.receta.imc,
        alergias: this.recetaAlergiasOpcion === 'NO' ? 'Ninguna conocida' : this.receta.alergias
      },
      idx: this.receta.idx,
      diagnosticoTratamiento: this.medicamentos
        .filter(m => m.medicamento.trim())
        .map(m => `${m.medicamento} — ${m.indicacion}`)
        .join('\n'),
      proximaCita: this.formatearFechaDDMMYYYY(this.receta.proximaCita),
      firma: this.receta.firma
    };
  }

  private descargarBlob(blob: Blob, headers: { get(name: string): string | null }, nombreDefecto: string): void {
    let nombreArchivo = nombreDefecto;
    const disposition = headers.get('content-disposition') ?? headers.get('Content-Disposition');
    if (disposition) {
      const coincidencia = disposition.match(/filename="?([^";]+)"?/i);
      if (coincidencia && coincidencia[1]) {
        nombreArchivo = coincidencia[1].trim();
      }
    }
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  }

  private async mostrarErrorBackendDesdeBlob(err: any, mensajeDefault: string): Promise<void> {
    let cuerpo: any = err?.error;
    if (cuerpo instanceof Blob) {
      try {
        const texto = await cuerpo.text();
        cuerpo = texto ? JSON.parse(texto) : null;
      } catch {
        cuerpo = null;
      }
    }
    this.mostrarErrorBackend({ error: cuerpo }, mensajeDefault);
  }

  guardandoPdfReceta = false;

  imprimirReceta(): void {
    if (!this.pacienteActivoId) {
      this.mostrarToast('Selecciona un paciente antes de generar el PDF.', 'error');
      return;
    }
    if (!this.receta.fecha) {
      Swal.fire({
        title: 'Falta la fecha',
        text: 'Selecciona la fecha de la receta antes de generar el PDF.',
        icon: 'warning',
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Entendido'
      }).then(() => this.refrescarVista());
      return;
    }

    this.guardandoPdfReceta = true;
    this.refrescarVista();

    const dto = this.construirRecetaDto();

    this.pdfService.generarRecetaPdf(dto).subscribe({
      next: (resp) => {
        this.guardandoPdfReceta = false;
        const blob = resp.body as Blob;
        this.descargarBlob(blob, resp.headers, `receta-${this.receta.folio || 'nueva'}.pdf`);
        this.refrescarVista();
      },
      error: async (err) => {
        this.guardandoPdfReceta = false;
        this.refrescarVista();
        await this.mostrarErrorBackendDesdeBlob(err, 'No se pudo generar el PDF de la receta.');
        console.error(err);
      }
    });
  }

  // ==================================================================
  // ===== HISTORIA CLÍNICA — conectada a POST/PUT /api/historias ======
  // ==================================================================

  historial: PatientIntakeFormDTO = {
    pacienteId: 0,
    patientInformation: {
      fullName: '',
      phone: '',
      dateOfBirth: '',
      email: '',
      gender: 'FEMALE',
      emergencyContact: ''
    },
    medicalHistory: {
      hasChronicDisease: { active: false, specific: '' },
      hasHadMajorSurgeries: { active: false, specific: '' },
      takesMedication: { active: false, medicationName: '' },
      hasAllergies: { active: false, specific: '' }
    },
    familyMedicalHistory: {
      hasImmediateFamilyHistory: false,
      heartDisease: false,
      highBloodPressure: false,
      diabetes: false,
      cancer: { active: false, specific: '' },
      other: { active: false, specific: '' }
    },
    reasonForVisit: {
      symptoms: '',
      symptomDuration: '',
      previousTreatment: ''
    },
    doctorNotes: {
      initialEvaluation: '',
      recommendedTestsOrTreatments: '',
      followUpAppointment: { active: false, date: '' }
    }
  };

  historialIdGuardado: number | null = null;
  guardandoHistorial = false;
  errorHistorial = '';
  exitoHistorial = '';

  cargarHistorialExistente(pacienteId: number): void {
    this.historialService.listarPorPaciente(pacienteId).subscribe({
      next: (data) => {
        if (data.length > 0) {
          this.cargarHistorialEnFormulario(data[0]);
        } else {
          this.reiniciarFormularioHistorialVacio();
        }
        this.refrescarVista();
      },
      error: (err) => {
        console.error(err);
        this.reiniciarFormularioHistorialVacio();
        this.refrescarVista();
      }
    });
  }

  private cargarHistorialEnFormulario(h: HistoriaClinicaResponseDTO): void {
    this.historialIdGuardado = h.id;
    this.historial = {
      pacienteId: h.pacienteId,
      patientInformation: { ...h.patientInformation },
      medicalHistory: {
        hasChronicDisease: { ...h.medicalHistory.hasChronicDisease },
        hasHadMajorSurgeries: { ...h.medicalHistory.hasHadMajorSurgeries },
        takesMedication: { ...h.medicalHistory.takesMedication },
        hasAllergies: { ...h.medicalHistory.hasAllergies }
      },
      familyMedicalHistory: {
        ...h.familyMedicalHistory,
        cancer: { ...h.familyMedicalHistory.cancer },
        other: { ...h.familyMedicalHistory.other }
      },
      reasonForVisit: { ...h.reasonForVisit },
      doctorNotes: {
        ...h.doctorNotes,
        followUpAppointment: { ...h.doctorNotes.followUpAppointment }
      }
    };
    if (this.pacienteActivo) {
      this.sincronizarInfoPacienteEnHistorial(this.pacienteActivo);
    }
    this.errorHistorial = '';
    this.exitoHistorial = '';
  }

  private reiniciarFormularioHistorialVacio(): void {
    this.historialIdGuardado = null;
    this.errorHistorial = '';
    this.exitoHistorial = '';
    this.historial.medicalHistory = {
      hasChronicDisease: { active: false, specific: '' },
      hasHadMajorSurgeries: { active: false, specific: '' },
      takesMedication: { active: false, medicationName: '' },
      hasAllergies: { active: false, specific: '' }
    };
    this.historial.familyMedicalHistory = {
      hasImmediateFamilyHistory: false,
      heartDisease: false,
      highBloodPressure: false,
      diabetes: false,
      cancer: { active: false, specific: '' },
      other: { active: false, specific: '' }
    };
    this.historial.reasonForVisit = {
      symptoms: '',
      symptomDuration: '',
      previousTreatment: ''
    };
    this.historial.doctorNotes = {
      initialEvaluation: '',
      recommendedTestsOrTreatments: '',
      followUpAppointment: { active: false, date: '' }
    };
    if (this.pacienteActivo) {
      this.sincronizarInfoPacienteEnHistorial(this.pacienteActivo);
    }
  }

  guardarHistoriaClinica(): void {
    this.errorHistorial = '';
    this.exitoHistorial = '';

    if (!this.pacienteActivoId) {
      this.errorHistorial = 'Selecciona un paciente antes de guardar la historia clínica.';
      return;
    }

    if (!this.historial.patientInformation.fullName.trim()) {
      this.errorHistorial = 'El nombre del paciente es obligatorio.';
      return;
    }

    const esActualizacion = !!this.historialIdGuardado;

    const titulo = esActualizacion ? '¿Actualizar historia clínica?' : '¿Guardar historia clínica?';
    const texto = esActualizacion
      ? `Se actualizará la historia clínica de "${this.historial.patientInformation.fullName}".`
      : `Se guardará una nueva historia clínica para "${this.historial.patientInformation.fullName}".`;
    const boton = esActualizacion ? 'Sí, actualizar' : 'Sí, guardar';

    this.confirmar(titulo, texto, boton).then(confirmado => {
      if (!confirmado) return;

      this.guardandoHistorial = true;
      this.historial.pacienteId = this.pacienteActivoId!;
      if (this.pacienteActivo) {
        this.sincronizarInfoPacienteEnHistorial(this.pacienteActivo);
      }
      this.refrescarVista();

      const peticion$ = this.historialIdGuardado
        ? this.historialService.actualizar(this.historialIdGuardado, this.historial)
        : this.historialService.crear(this.historial);

      peticion$.subscribe({
        next: (response) => {
          this.guardandoHistorial = false;
          this.historialIdGuardado = response.id;
          this.exitoHistorial = esActualizacion
            ? 'Historia clínica actualizada con éxito.'
            : 'Historia clínica guardada con éxito.';
          this.mostrarToast(this.exitoHistorial, 'success');
          this.refrescarVista();

          Swal.fire({
            title: esActualizacion ? '¡Actualizada!' : '¡Guardada!',
            text: this.exitoHistorial,
            icon: 'success',
            confirmButtonColor: '#2ecc71',
            confirmButtonText: 'Aceptar',
            timer: 2500,
            timerProgressBar: true
          }).then(() => this.refrescarVista());
        },
        error: (err) => {
          this.guardandoHistorial = false;
          this.errorHistorial = 'No se pudo guardar la historia clínica.';
          this.refrescarVista();
          this.mostrarErrorBackend(err, 'No se pudo guardar la historia clínica. Verifica los datos e intenta de nuevo.');
          console.error(err);
        }
      });
    });
  }

  guardandoPdfHistorial = false;

  imprimirHistoria(): void {
    if (!this.pacienteActivoId) {
      this.mostrarToast('Selecciona un paciente antes de generar el PDF.', 'error');
      return;
    }
    if (!this.historial.patientInformation.fullName.trim()) {
      this.mostrarToast('Falta el nombre del paciente para generar el PDF.', 'error');
      return;
    }

    this.guardandoPdfHistorial = true;
    this.refrescarVista();

    this.historial.pacienteId = this.pacienteActivoId;
    if (this.pacienteActivo) {
      this.sincronizarInfoPacienteEnHistorial(this.pacienteActivo);
    }

    this.pdfService.generarHistoriaPdf(this.historial).subscribe({
      next: (resp) => {
        this.guardandoPdfHistorial = false;
        const blob = resp.body as Blob;
        this.descargarBlob(blob, resp.headers, `historia-clinica-${this.historial.patientInformation.fullName}.pdf`);
        this.refrescarVista();
      },
      error: async (err) => {
        this.guardandoPdfHistorial = false;
        this.refrescarVista();
        await this.mostrarErrorBackendDesdeBlob(err, 'No se pudo generar el PDF de la historia clínica.');
        console.error(err);
      }
    });
  }

}
