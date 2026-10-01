import {
  Component,
  inject,
  OnInit,
  signal,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { EventosService, TIPOS_EVENTO, ESTADOS_EVENTO, SEDES_EVENTO } from '../../services/eventos';
import { NotificationService } from '../../services/notification';
import { PermisosService } from '../../services/permisos';
import { Evento, EventoInscrito, TipoEvento, EstadoEvento, DatosInscripcion } from '../../models/evento.model';
import { PaginacionComponent } from '../paginacion/paginacion';
import { paginar, PAGE_SIZE } from '../../utils/paginacion';

// Mismos limites que valida el backend (eventos.js). Se repiten aqui para
// avisar al usuario antes de hacer un request, no para sustituir la validacion
// del servidor: esta es una comodidad, la que manda es la del backend.
const EDAD_MIN = 4;
const EDAD_MAX = 99;

// Reporte de inscripciones a eventos. Es el equivalente al reporte de
// asistencias: una vista de SOLO LECTURA para el entrenador, que aqui no
// edita nada sino que consulta who confirmed and brings the list to the event.
//
// Por eso no reutiliza el modal de inscritos que vive en la pantalla de Eventos:
// ese esta atado a una fila de una tabla con acciones de editar/borrar, y aqui
// lo que se necesita es filtrar por fecha y sede para preparar una convocatoria.
@Component({
  selector: 'app-reporte-inscripciones',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './reporte-inscripciones.html',
  styleUrl: './reporte-inscripciones.scss',
})
export class ReporteInscripciones implements OnInit {
  private eventosService = inject(EventosService);
  private notificationService = inject(NotificationService);
  private permisosService = inject(PermisosService);
  private cdr = inject(ChangeDetectorRef);

  readonly pageSize = PAGE_SIZE;
  readonly tipos = TIPOS_EVENTO;
  readonly estados = ESTADOS_EVENTO;
  readonly sedes = SEDES_EVENTO;

  eventos = signal<Evento[]>([]);
  cargando = signal(true);
  error = signal('');
  pagina = signal(1);

  // Los filtros son signals y no propiedades planas A PROPOSITO: viven dentro
  // de `eventosFiltrados`, que es un computed. Un computed solo se vuelve a
  // evaluar cuando cambia un signal del que lee; si estos fueran `filtroSede = ''`
  // a secas, escribir en el <select> no invalidaria nada y la tabla se quedaria
  // pegada en la lista anterior con el filtro puesto.
  filtroTexto = signal('');
  filtroTipo = signal('');
  filtroEstado = signal('');
  filtroSede = signal('');
  fechaDesde = signal('');
  fechaHasta = signal('');

  // Detalle: la lista de confirmados del evento que se eligio.
  eventoSeleccionado = signal<Evento | null>(null);
  inscritos = signal<EventoInscrito[]>([]);
  cargandoDetalle = signal(false);
  errorDetalle = signal('');

  ngOnInit(): void {
    this.cargar();
    this.inicializarPermisos();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.eventosService.loadAll().subscribe({
      next: datos => {
        this.eventos.set(datos);
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(this.explicarError(err));
        this.cargando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private explicarError(e: HttpErrorResponse): string {
    if (e.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexion e intenta de nuevo.';
    }
    if (e.status === 401) return 'Tu sesion expiro. Inicia sesion nuevamente.';
    if (e.status === 403) return 'No tienes permiso para ver las inscripciones a eventos.';
    return e.error?.message || 'Ocurrio un error al cargar los eventos.';
  }

  // --- Filtros ---
  get hayFiltros(): boolean {
    return !!(this.filtroTexto().trim() || this.filtroTipo() || this.filtroEstado()
      || this.filtroSede() || this.fechaDesde() || this.fechaHasta());
  }

  eventosFiltrados = computed(() => {
    const texto = this.filtroTexto().trim().toLowerCase();
    const tipo = this.filtroTipo() as TipoEvento | '';
    const estado = this.filtroEstado() as EstadoEvento | '';
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const sede = this.filtroSede();

    return this.eventos().filter(e => {
      if (tipo && e.tipo !== tipo) return false;
      if (estado && e.estado !== estado) return false;

      // La sede es una LISTA separada por comas ("Progreso, Morelos"), asi que
      // un torneo en ambas sedes tiene que aparecer al filtrar por cualquiera de
      // las dos. Buscar con === lo esconderia de los dos filtros, que es
      // exactamente el torneo que el entrenador mas necesita ver.
      if (sede && !e.sede.toLowerCase().includes(sede.toLowerCase())) {
        return false;
      }

      // Se compara contra el dia local, no contra el instante. `fechaInicio` es
      // un ISO con zona: cortarlo a los primeros 10 caracteres da la fecha en
      // UTC, que en Mexico es un dia anterior para cualquier torneo de la
      // tarde. Por eso se pasa por Date antes de formatear.
      const dia = this.diaLocal(e.fechaInicio);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;

      if (texto) {
        const heno = `${e.nombre} ${e.categorias} ${e.lugar} ${e.sede}`.toLowerCase();
        if (!heno.includes(texto)) return false;
      }
      return true;
    });
  });

  total = computed(() => this.eventosFiltrados().length);
  eventosPagina = computed(() => paginar(this.eventosFiltrados(), this.pagina(), this.pageSize));

  // Totales del reporte, sobre lo ya filtrado: son las cifras que se leen en
  // voz alta ("van 180 inscritos en lo que lleva del año"), asi que tienen que
  // ignorar la paginacion.
  totalInscritos = computed(() =>
    this.eventosFiltrados().reduce((suma, e) => suma + e.inscritos, 0)
  );
  totalConInscritos = computed(() =>
    this.eventosFiltrados().filter(e => e.inscritos > 0).length
  );
  totalCancelados = computed(() =>
    this.eventosFiltrados().filter(e => e.estado === 'cancelado').length
  );

  aplicarFiltros(): void {
    this.pagina.set(1);
  }

  limpiarFiltros(): void {
    this.filtroTexto.set('');
    this.filtroTipo.set('');
    this.filtroEstado.set('');
    this.filtroSede.set('');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.pagina.set(1);
  }

  cambiarPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  // "YYYY-MM-DD" en hora local, para comparar contra <input type="date">.
  private diaLocal(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  lugaresLibres(e: Evento): number | null {
    return e.cupoMaximo != null ? Math.max(0, e.cupoMaximo - e.inscritos) : null;
  }

  estaLleno(e: Evento): boolean {
    return e.cupoMaximo != null && e.inscritos >= e.cupoMaximo;
  }

  // Las etiquetas salen de los mismos arrays que usa la pantalla de Eventos, en
  // vez de un segundo mapa copiado aqui: si se agrega un tipo y se olvida esta
  // copia, el Excel sale con el valor crudo ("dual_meet") donde el resto del
  // sistema ya dice "Dual Meet".
  etiquetaTipo(t: TipoEvento): string {
    return TIPOS_EVENTO.find(x => x.valor === t)?.etiqueta || t;
  }

  etiquetaEstado(e: EstadoEvento): string {
    return ESTADOS_EVENTO.find(x => x.valor === e)?.etiqueta || e;
  }

  // --- Detalle de inscritos ---

  verDetalle(evento: Evento): void {
    this.eventoSeleccionado.set(evento);
    this.inscritos.set([]);
    this.errorDetalle.set('');
    this.cargandoDetalle.set(true);

    this.eventosService.loadInscritos(evento.id).subscribe({
      next: data => {
        this.inscritos.set(data);
        this.cargandoDetalle.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.errorDetalle.set(err.error?.message || 'No se pudo cargar la lista de inscritos.');
        this.cargandoDetalle.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  cerrarDetalle(): void {
    this.eventoSeleccionado.set(null);
    this.inscritos.set([]);
    this.errorDetalle.set('');
  }

  // --- Correccion de un inscrito ---
  //
  // El snapshot es congelado a proposito, asi que una inscripcion vieja puede
  // tener la edad o la escuela vacias y no hay forma de llenarlas salvo
  // reinscribirse. Este formulario es el remedio: escribe sobre la inscripcion,
  // no sobre el perfil del alumno.

  // El id de la inscripcion que se esta editando, o null si el editor esta
  // cerrado. Se guarda el id y no el objeto entero a proposito: si se guardara
  // el objeto, un guardado exitoso dejaria el signal apuntando a una copia
  // desactualizada de la fila.
  editandoId = signal<number | null>(null);
  editandoGuardando = signal(false);
  editandoError = signal('');

  // Copia de trabajo de los campos. Se inicializa desde la fila al abrir para
  // no editar sobre el objeto original.
  editandoDatos = signal({
    nombre: '',
    primerApellido: '',
    segundoApellido: '',
    edad: null as number | null,
    grado: '',
    escuela: '',
  });

  puedeEditarInscrito = signal(false);

  abrirEditor(i: EventoInscrito): void {
    this.editandoId.set(i.id);
    this.editandoError.set('');
    this.editandoGuardando.set(false);
    this.editandoDatos.set({
      nombre: i.nombre,
      primerApellido: i.primerApellido,
      segundoApellido: i.segundoApellido,
      edad: i.edad,
      grado: i.grado,
      escuela: i.escuela,
    });
  }

  cerrarEditor(): void {
    this.editandoId.set(null);
    this.editandoError.set('');
  }

  actualizarEditando(campo: 'nombre' | 'primerApellido' | 'segundoApellido' | 'grado' | 'escuela', valor: string): void {
    this.editandoDatos.update(d => ({ ...d, [campo]: valor }));
  }

  actualizarEdad(valor: string): void {
    // '' es "no la tengo", no un 0. Convertirlo a 0 grabaria una edad falsa
    // en una columna que si puede quedar nula.
    this.editandoDatos.update(d => ({ ...d, edad: valor === '' ? null : Number(valor) }));
  }

  private validarEditando(): string {
    const d = this.editandoDatos();
    if (!d.nombre.trim()) return 'Escribe el nombre.';
    if (!d.primerApellido.trim()) return 'Escribe el apellido paterno.';
    if (!d.grado.trim()) return 'Escribe el grado.';
    if (!d.escuela.trim()) return 'Escribe la escuela.';
    if (d.edad !== null && (!Number.isInteger(d.edad) || d.edad < EDAD_MIN || d.edad > EDAD_MAX)) {
      return `La edad debe ser un número entero entre ${EDAD_MIN} y ${EDAD_MAX}.`;
    }
    return '';
  }

  guardarEditor(): void {
    const evento = this.eventoSeleccionado();
    const inscripcionId = this.editandoId();
    if (!evento || inscripcionId === null) return;

    const error = this.validarEditando();
    if (error) {
      this.editandoError.set(error);
      return;
    }

    this.editandoGuardando.set(true);
    this.editandoError.set('');
    const d = this.editandoDatos();

    this.eventosService.editarInscrito(evento.id, inscripcionId, {
      nombre: d.nombre.trim(),
      primerApellido: d.primerApellido.trim(),
      segundoApellido: d.segundoApellido.trim(),
      edad: d.edad,
      grado: d.grado.trim(),
      escuela: d.escuela.trim(),
    }).subscribe({
      next: actualizada => {
        // Se reemplaza la fila en la lista en vez de recargar todo: el modal ya
        // esta abierto y un reload lo cerraria o haria parpadear la tabla.
        this.inscritos.update(lista =>
          lista.map(x => (x.id === inscripcionId ? actualizada : x))
        );
        this.editandoGuardando.set(false);
        this.editandoId.set(null);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.editandoError.set(err.error?.message || 'No se pudo guardar la corrección.');
        this.editandoGuardando.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // El boton de corregir se oculta sin permiso de `editar:eventos`: es escritura sobre
  // el registro de un alumno, no consulta. Ver la lista si se puede con
  // `ver:reporte_eventos` solamente.
  inicializarPermisos(): void {
    this.permisosService.getMisPermisos().subscribe({
      next: res => this.puedeEditarInscrito.set((res.permisos || []).includes('eventos:editar:eventos')),
      error: () => this.puedeEditarInscrito.set(false),
    });
  }

  nombreCompleto(i: EventoInscrito): string {
    return `${i.nombre} ${i.primerApellido} ${i.segundoApellido}`.trim();
  }

  // Cuentas cuantas filas quedaron incompletas. Se muestra como aviso porque la
  // consecuencia es silenciosa: la lista se imprime igual, con dos rayas, y el
  // problema aparece en la puerta del torneo.
  faltanDatos = computed(() =>
    this.inscritos().filter(i => i.edad == null || !i.escuela || !i.escuela.trim()).length
  );

  // Cuenta cuantos de una escuela hay en la lista. La convocatoria se manda por
  // escuela, asi que tener el desglose ahi evita contar a mano sobre la tabla.
  escuelasDe(e: Evento): { escuela: string; total: number }[] {
    const cuenta = new Map<string, number>();
    for (const i of this.inscritos()) {
      const clave = (i.escuela || 'Sin escuela').trim();
      cuenta.set(clave, (cuenta.get(clave) || 0) + 1);
    }
    return Array.from(cuenta.entries())
      .map(([escuela, total]) => ({ escuela, total }))
      .sort((a, b) => b.total - a.total || a.escuela.localeCompare(b.escuela));
  }

  private sanea(texto: string): string {
    return (texto || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 40);
  }

  // --- Excel ---

  // Exporta la lista de confirmados del evento abierto. Es el archivo que se
  // lleva el entrenador al torneo: nombres, grado, escuela y a que hora se
  // inscribio cada uno.
  descargarDetalleExcel(): void {
    const evento = this.eventoSeleccionado();
    if (!evento || this.inscritos().length === 0) return;

    const datos = this.inscritos().map((i, n) => ({
      'No.': n + 1,
      'Nombre': `${i.nombre} ${i.primerApellido} ${i.segundoApellido}`.trim(),
      'Edad': i.edad ?? '-',
      'Grado': i.grado,
      'Escuela': i.escuela || '-',
      'Se inscribio': i.createdAt ? new Date(i.createdAt).toLocaleString('es-MX') : '-',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');

    ws['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 8 }, { wch: 14 }, { wch: 30 }, { wch: 20 }];

    // Segunda hoja con el desglose por escuela, que es como se reparte la
    // convocatoria.
    const porEscuela = this.escuelasDe(evento).map(e => ({
      'Escuela': e.escuela,
      'Inscritos': e.total,
    }));
    if (porEscuela.length > 0) {
      const ws2: XLSX.WorkSheet = XLSX.utils.json_to_sheet(porEscuela);
      ws2['!cols'] = [{ wch: 40 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Por escuela');
    }

    const nombre = ['inscripciones', this.sanea(evento.nombre)].filter(Boolean).join('_');
    XLSX.writeFile(wb, `${nombre}.xlsx`);
    this.cdr.markForCheck();
    this.notificationService.success('Lista de inscritos descargada');
  }

  // Exporta el resumen de todos los eventos que pasan el filtro, no solo los de
  // la pagina visible: sirve para el reporte del cierre del ciclo.
  descargarResumenExcel(): void {
    const lista = this.eventosFiltrados();
    if (lista.length === 0) return;

    const datos = lista.map(e => ({
      'Evento': e.nombre,
      'Tipo': this.etiquetaTipo(e.tipo),
      'Estado': this.etiquetaEstado(e.estado),
      'Fecha': e.fechaInicio ? new Date(e.fechaInicio).toLocaleString('es-MX') : '-',
      'Sede': e.sede || '-',
      'Lugar': e.lugar || '-',
      'Categorias': e.categorias || '-',
      'Inscritos': e.inscritos,
      'Cupo': e.cupoMaximo ?? 'Sin limite',
      'Libres': this.lugaresLibres(e) ?? 'Sin limite',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Eventos');

    ws['!cols'] = [
      { wch: 34 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
      { wch: 24 }, { wch: 30 }, { wch: 11 }, { wch: 12 }, { wch: 12 },
    ];

    XLSX.writeFile(wb, 'reporte_inscripciones_eventos.xlsx');
    this.cdr.markForCheck();
    this.notificationService.success('Resumen descargado');
  }
}
