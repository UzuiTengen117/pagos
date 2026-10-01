import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { Evento, DatosInscripcion } from '../../../models/evento.model';
import { EventosService, TIPOS_EVENTO } from '../../../services/eventos';
import { AlumnosService } from '../../../services/alumnos';
import { NotificationService } from '../../../services/notification';
import { RefreshService } from '../../../services/refresh';
import { AuthService } from '../../../services/auth';
import { calcularCuentaRegresiva, dosDigitos as padDos, formatearFechaLarga } from '../../../utils/cuentaRegresiva';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar, PAGE_SIZE } from '../../../utils/paginacion';
import { NOMBRE_ESCUELA } from '../../../utils/academia';

interface TarjetaEvento {
  evento: Evento;
  cuenta: ReturnType<typeof calcularCuentaRegresiva>;
  // Estado guardado o reloj, el queSea. La plantilla lo usa para decidir si
  // muestra el reloj o el aviso, y no solo el reloj.
  terminada: boolean;
  puedeInscribirse: boolean;
  motivoBloqueo: string;
}

@Component({
  selector: 'app-alumno-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './alumno-eventos.html',
  styleUrl: './alumno-eventos.scss',
})
export class AlumnoEventos implements OnInit, OnDestroy {
  private eventosService = inject(EventosService);
  private alumnosService = inject(AlumnosService);
  private notificationService = inject(NotificationService);
  private refreshService = inject(RefreshService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  private subscriptions = new Subscription();

  // Un solo signal de "ahora" para todos los relojes. Cada segundo se actualiza
  // una vez y los contadores de todas las tarjetas se recalculan contra el, en
  // vez de tener un temporizador por evento que se desincroniza al segundo tic.
  private ahora = signal(Date.now());

  eventos = signal<Evento[]>([]);

  // Fechas ya formateadas en su propio computed. Si se calcularan dentro de
  // `tarjetas` se reharían en cada tic del reloj, y Intl no es barato; este
  // computed no lee `ahora` así que solo corre cuando cambia la lista.
  fechasTexto = computed(() => {
    const mapa = new Map<number, string>();
    for (const evento of this.eventos()) {
      mapa.set(evento.id, formatearFechaLarga(evento.fechaInicio));
    }
    return mapa;
  });

  cargando = signal(true);
  errorCarga = signal('');
  filtro = signal<'proximos' | 'todos'>('proximos');
  procesando = signal<number | null>(null);
  pagina = signal(1);

  visiblesPagina = computed(() => paginar(this.visibles(), this.pagina()));

  readonly tipos = TIPOS_EVENTO;

  // Tarjetas con el reloj ya resuelto para el instante actual. Al leer
  // this.ahora() el computed se invalida solo en cada tic.
  tarjetas = computed<TarjetaEvento[]>(() => {
    const ahora = this.ahora();
    // Solo el alumno se inscribe. La ruta no restringe por rol (la lista es
    // publica para cualquier sesion iniciada, igual que becas), asi que un
    // profesor que llegara aqui veria la informacion pero no el boton: el
    // backend resolveria su alumno_id y no encontraria registro.
    const esAlumno = this.authService.currentUser()?.rol === 'estudiante';

    return this.eventos().map(evento => {
      const cuenta = calcularCuentaRegresiva(evento.fechaInicio, ahora);

      // El estado guardado manda igual que la fecha. Con solo mirar el reloj, un
      // evento marcado "finalizado" por el entrenador aparecia con "Inscribirme"
      // y el backend lo rechazaba con un 400: el boton prometia algo que no iba
      // a pasar.
      const cancelado = evento.estado === 'cancelado';
      const yaFue = evento.estado === 'finalizado' || evento.estado === 'en_curso';
      const terminada = yaFue || cuenta.terminado;
      const lleno = evento.cupoMaximo != null && evento.inscritos >= evento.cupoMaximo;

      let puedeInscribirse = esAlumno && !terminada && !cancelado && !lleno;

      let motivoBloqueo = '';
      if (cancelado) motivoBloqueo = 'Este evento fue cancelado';
      else if (terminada) motivoBloqueo = yaFue ? 'Este evento ya se lleva a cabo' : 'Ya se llevó a cabo';
      else if (lleno) motivoBloqueo = 'Cupo lleno';

      return { evento, cuenta, terminada, puedeInscribirse, motivoBloqueo };
    });
  });

  // "Próximos" es la pestaña por defecto y esconde lo que ya no admite
  // inscripción. Si no quedara nada, caeria al estado vacío siempre y no habria
  // forma de consultar el historial, así que cae a mostrar todo.
  visibles = computed(() => {
    const todas = this.tarjetas();
    if (this.filtro() === 'proximos') {
      const vigentes = todas.filter(t => t.evento.estado !== 'cancelado' && !t.terminada);
      return vigentes.length > 0 ? vigentes : todas;
    }
    return todas;
  });

  // Solo cuando no hay NADA vigente pero si historial. Comparar longitudes no
  // sirve: con tres eventos próximos visibles() tambien trae los tres, y el
  // aviso apareceria en cada carga.
  mostrandoTodosPorFallo = computed(() => {
    if (this.filtro() !== 'proximos') {
      return false;
    }
    const tarjetas = this.tarjetas();
    const vigentes = tarjetas.filter(t => t.evento.estado !== 'cancelado' && !t.terminada);
    return vigentes.length === 0 && tarjetas.length > 0;
  });

  ngOnInit(): void {
    this.cargar();

    this.subscriptions.add(interval(1000).subscribe(() => this.ahora.set(Date.now())));
    this.subscriptions.add(this.refreshService.refresh$.subscribe(() => this.cargar(false)));

    // En pestanas en segundo plano el navegador frena los temporizadores, asi
    // que al volver se resincroniza el reloj en vez de mostrar segundos contados
    // de menos.
    document.addEventListener('visibilitychange', this.alVolverVisible);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.removeEventListener('visibilitychange', this.alVolverVisible);
  }

  private alVolverVisible = (): void => {
    if (document.visibilityState === 'visible') {
      this.ahora.set(Date.now());
    }
  };

  cargar(mostrarCargando = true): void {
    if (mostrarCargando) {
      this.cargando.set(true);
    }

    this.eventosService.loadAll().subscribe({
      next: (data) => {
        this.eventos.set(data);
        this.cargando.set(false);
        this.errorCarga.set('');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.eventos.set([]);
        this.cargando.set(false);
        this.errorCarga.set(
          err?.status === 0
            ? 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
            : err?.error?.message || 'No se pudieron cargar los eventos.'
        );
        this.cdr.markForCheck();
      },
    });
  }

  // --- Inscripción ---

  // Cancelar es una accion de un toque: no hay nada que confirmar. Inscribirse
  // abre el formulario, porque el backend exige los datos del alumno.
  toggleInscripcion(evento: Evento): void {
    if (this.procesando() !== null) {
      return;
    }

    if (evento.miInscripcion) {
      this.procesando.set(evento.id);
      this.eventosService.cancelarInscripcion(evento.id).subscribe({
        next: () => {
          this.procesando.set(null);
          this.cdr.markForCheck();
          this.notificationService.success('Inscripción cancelada');
        },
        error: (err) => {
          this.procesando.set(null);
          this.cdr.markForCheck();
          this.notificationService.error(err?.error?.message || 'No se pudo cancelar la inscripción.');
        },
      });
      return;
    }

    this.abrirModalInscripcion(evento);
  }

  showModalInscripcion = signal(false);
  eventoParaInscribir = signal<Evento | null>(null);
  cargandoPerfil = signal(false);
  enviandoInscripcion = signal(false);
  errorInscripcion = signal('');

  datos = signal<DatosInscripcion>({
    nombre: '',
    primerApellido: '',
    segundoApellido: '',
    edad: null,
    grado: '',
    escuela: NOMBRE_ESCUELA,
  });

  // Abre el modal. El perfil se pide una sola vez y se cachea en el servicio: si
  // el alumno ya se ha inscrito antes, la segunda vez los campos llegan listos
  // sin volver a pegarle a la base.
  abrirModalInscripcion(evento: Evento): void {
    this.eventoParaInscribir.set(evento);
    this.errorInscripcion.set('');

    // Se conservan los datos ya escritos si el alumno cierra y reabre el modal.
    // La escuela NO se conserva: se vuelve a poner la de la academia en cada
    // apertura. Sin esto sobrevive un valor viejo (un alumno que escribio otra
    // escuela antes de que el campo se bloqueara) y se mandaria dentro de un
    // input que ya no se puede editar, o sea, sin que nadie lo notara.
    const previos = this.datos();
    this.datos.set({
      ...(previos.nombre ? previos : this.datosVacios()),
      escuela: NOMBRE_ESCUELA,
    });

    this.showModalInscripcion.set(true);
    this.cargarPerfil();
  }

  private datosVacios(): DatosInscripcion {
    return { nombre: '', primerApellido: '', segundoApellido: '', edad: null, grado: '', escuela: NOMBRE_ESCUELA };
  }

  private cargarPerfil(): void {
    this.cargandoPerfil.set(true);
    this.alumnosService.getMiPerfil().subscribe({
      next: (alumno) => {
        this.cargandoPerfil.set(false);
        // Solo rellena los campos vacios: si el alumno ya habia escrito algo y
        // solo le falta el grado, recargando el perfil no se le borra lo suyo.
        this.datos.update(d => ({
          ...d,
          nombre: d.nombre || alumno.nombre || '',
          primerApellido: d.primerApellido || alumno.primerApellido || '',
          segundoApellido: d.segundoApellido || alumno.segundoApellido || '',
          grado: d.grado || alumno.grado || '',
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoPerfil.set(false);
        // No es un error bloqueante: el alumno puede escribirlo a mano.
        this.cdr.markForCheck();
      },
    });
  }

  cerrarModalInscripcion(): void {
    if (this.enviandoInscripcion()) {
      return;
    }
    this.showModalInscripcion.set(false);
    this.eventoParaInscribir.set(null);
    this.errorInscripcion.set('');
  }

  actualizarDato<K extends keyof DatosInscripcion>(campo: K, valor: DatosInscripcion[K]): void {
    this.datos.update(d => ({ ...d, [campo]: valor }));
    // Se limpia el error en cada tecla: dejarlo pegado arriba mientras el alumno
    // corrige se siente como que el formulario no responde.
    this.errorInscripcion.set('');
  }

  // El input type=number entrega string; se convierte aqui para que el resto
  // maneje number|null y no "12".
  actualizarEdad(valor: string): void {
    this.actualizarDato('edad', valor === '' ? null : Number(valor));
  }

  validarInscripcion(): string {
    const d = this.datos();
    if (!d.nombre.trim()) return 'Escribe tu nombre';
    if (!d.primerApellido.trim()) return 'Escribe tu apellido paterno';
    if (!d.grado.trim()) return 'Escribe tu grado';
    // La escuela no se valida: la pone la academia en cada apertura y el input
    // va bloqueado, asi que el alumno no tiene como dejarla vacia.

    if (d.edad !== null) {
      if (!Number.isInteger(d.edad)) return 'Ingresa una edad válida';
      if (d.edad < 4 || d.edad > 99) return 'Ingresa una edad válida (entre 4 y 99)';
    }
    return '';
  }

  confirmarInscripcion(): void {
    const evento = this.eventoParaInscribir();
    if (!evento || this.enviandoInscripcion()) {
      return;
    }

    const error = this.validarInscripcion();
    if (error) {
      this.errorInscripcion.set(error);
      return;
    }

    this.enviandoInscripcion.set(true);
    this.errorInscripcion.set('');
    this.procesando.set(evento.id);

    this.eventosService.inscribirse(evento.id, this.datos()).subscribe({
      next: () => {
        this.enviandoInscripcion.set(false);
        this.procesando.set(null);
        this.showModalInscripcion.set(false);
        this.eventoParaInscribir.set(null);
        // Se limpian los datos: la escuela o el grado pueden cambiar para el
        // siguiente torneo, y arrastrar el valor viejo invita al error.
        this.datos.set(this.datosVacios());
        this.cdr.markForCheck();
        this.notificationService.success(`Te inscribiste a ${evento.nombre}`);
      },
      error: (err) => {
        this.enviandoInscripcion.set(false);
        this.procesando.set(null);
        this.errorInscripcion.set(err?.error?.message || 'No se pudo completar la inscripción.');
        this.cdr.markForCheck();
      },
    });
  }

  // --- Utilidades de plantilla ---

  // Se expone como metodo y no como computed: depende del argumento de la
  // tarjeta, no de un estado unico del componente.
  dosDigitos(valor: number): string {
    return padDos(valor);
  }

  tipoEtiqueta(tipo: Evento['tipo']): string {
    return this.tipos.find(t => t.valor === tipo)?.etiqueta || tipo;
  }

  // `!= null` y no `=== null`: el mapper devuelve null cuando no hay cupo, pero
  // un JSON viejo sin el campo llega undefined y con la comparacion estricta el
  // evento se renderizaba con "/ undefined" y "NaN lugares".
  plazasRestantes(evento: Evento): number | null {
    if (evento.cupoMaximo == null) {
      return null;
    }
    return Math.max(0, evento.cupoMaximo - evento.inscritos);
  }

  setFiltro(valor: 'proximos' | 'todos'): void {
    this.filtro.set(valor);
    this.pagina.set(1);
  }
}
