import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService } from './services/pdf.service';
import { PacienteService } from './services/paciente.service';
import { Paciente, PacienteRequest } from './models/paciente.model';
import { RecetaService } from './services/receta.service';
import { RecetaDTO, RecetaResponseDTO } from './models/receta.model';
import { HistorialService } from './services/historial.service';
import { PatientIntakeFormDTO, HistoriaClinicaResponseDTO } from './models/historial.model';
import Swal from 'sweetalert2';

type TabId = 'historia' | 'consultas' | 'recetas';
type ToastTipo = 'success' | 'error';

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
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  constructor(
    private pacienteService: PacienteService,
    private recetaService: RecetaService,
    private historialService: HistorialService,
    private cdr: ChangeDetectorRef,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    this.cargarPacientes();
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
      next: (data) => {
        this.pacientes = data;
        this.cargandoPacientes = false;
        // No se selecciona ningún paciente automáticamente al cargar.
        // El usuario debe elegir uno de la lista para ver/editar su información.
        this.refrescarVista();
      },
      error: (err) => {
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

    // Al cambiar de paciente, se busca si ya tiene historia clínica y/o
    // receta guardadas. Si existen, se cargan al formulario. Si no, se
    // deja el formulario en blanco (sin inventar ni arrastrar datos de otro paciente).
    this.cargarHistorialExistente(id);
    this.cargarRecetaExistente(id);
  }

  toggleChip(event: Event): void {
    (event.target as HTMLElement).classList.toggle('on');
  }

  /** El expediente ya no se captura a mano: se calcula a partir del ID del paciente. */
  formatExpediente(id: number): string {
    return String(id).padStart(4, '0');
  }

  /** El folio de receta tampoco se captura a mano: se calcula a partir del ID de la receta. */
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

  // Si tiene valor, "Guardar" actualiza ese paciente. Si es null, crea uno nuevo.
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

          // Si el backend no regresa el objeto actualizado (204 sin body, etc.),
          // usamos el id que ya teníamos y los datos del formulario como respaldo.
          const idResultante = guardado?.id ?? this.pacienteIdEnEdicion;
          const nombreResultante = guardado?.nombreCompleto ?? this.pacienteNuevo.nombreCompleto;

          this.pacienteIdEnEdicion = idResultante;
          this.exitoPaciente = esActualizacion
            ? `Paciente "${nombreResultante}" actualizado con éxito.`
            : `Paciente "${nombreResultante}" guardado con éxito.`;
          this.modalPacienteAbierto = false;

          // Si es un paciente nuevo, ahora que ya tiene ID, le asignamos
          // su expediente (ID con ceros a la izquierda) con una petición extra.
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
      `¿Seguro que quieres eliminar a "${nombre}"? Esta acción no se puede deshacer.`,
      'Sí, eliminar'
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
          this.mostrarToast(`Paciente "${nombre}" eliminado con éxito.`, 'success');
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

  /**
   * Copia los datos generales del paciente (ya capturados en su ficha)
   * hacia la sección "Información del paciente" de la historia clínica,
   * para que esos campos queden autollenados y bloqueados en el formulario.
   */
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

  /** true cuando hay un paciente seleccionado: bloquea los campos de "Información del paciente". */
  get infoPacienteBloqueada(): boolean {
    return !!this.pacienteActivoId;
  }

  // ==================================================================
  // ===== RECETA — conectada a POST/PUT /api/recetas ===================
  // ==================================================================

  /** El médico que expide la receta siempre es el mismo en este consultorio. */
  readonly medicoFijo = 'Dr. Fredy Gil Garcia';

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
    firma: this.medicoFijo
  };

  medicamentos: MedicamentoLinea[] = [
    { medicamento: '', indicacion: '' }
  ];

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

  /** Todas las recetas guardadas del paciente activo, para poder elegir cuál ver/editar. */
  recetasPaciente: RecetaResponseDTO[] = [];

  /** Busca todas las recetas del paciente. Si tiene alguna, carga la más reciente. Si no, deja el form vacío. */
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

  /** Carga en el formulario una receta específica de la lista (al hacer clic en un chip). */
  seleccionarReceta(id: number): void {
    const receta = this.recetasPaciente.find(r => r.id === id);
    if (!receta) return;
    this.cargarRecetaEnFormulario(receta);
    this.refrescarVista();
  }

  /** Limpia el formulario para capturar una receta nueva, sin perder la lista de recetas anteriores. */
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
      firma: this.medicoFijo
    };
    this.medicamentos = r.diagnosticoTratamiento
      ? r.diagnosticoTratamiento.split('\n').filter(l => l.trim()).map(linea => {
          const [medicamento, indicacion] = linea.split(' — ');
          return { medicamento: medicamento ?? '', indicacion: indicacion ?? '' };
        })
      : [{ medicamento: '', indicacion: '' }];
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
      peso: '', talla: '', ta: '', fc: '', fr: '', temp: '', sato2: '', imc: '', alergias: '',
      idx: '', proximaCita: '', firma: this.medicoFijo
    };
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

          // Actualiza la lista de recetas en memoria, sin volver a pedirla al backend.
          const idx = this.recetasPaciente.findIndex(r => r.id === response.id);
          if (idx !== -1) {
            this.recetasPaciente[idx] = response;
          } else {
            this.recetasPaciente = [response, ...this.recetasPaciente];
          }

          // Si es una receta nueva, ahora que ya tiene ID, le asignamos
          // su folio (ID con ceros a la izquierda) con una petición extra.
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

  /** Arma el RecetaDTO exactamente igual que guardarReceta(), para reusarlo también al generar el PDF. */
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
        alergias: this.receta.alergias
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

  /** Dispara la descarga de un blob (el PDF) con el nombre de archivo que mande el backend, o uno por defecto. */
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

  /**
   * Cuando la petición se hace con responseType 'blob', si el backend responde un error (400, 500),
   * Angular entrega ese error también como Blob (no como JSON), así que hay que leerlo aparte
   * antes de poder mostrar el mensaje real del backend en el Swal.
   */
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

  /** Genera y descarga el PDF de la receta actual usando el backend (/api/expedientes/receta-medica). */
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

  /** Busca si el paciente ya tiene historia(s) clínica(s) guardadas; si sí, carga la más reciente. Si no, deja el form vacío. */
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
    // La info del paciente siempre refleja la ficha actual (campos bloqueados), no el snapshot guardado.
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

  /** Genera y descarga el PDF de la historia clínica actual usando el backend (/api/expedientes/historia-clinica). */
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
