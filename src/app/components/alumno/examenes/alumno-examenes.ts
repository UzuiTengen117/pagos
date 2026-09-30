import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { Examen, DatosInscripcion } from '../../../models/examen.model';
import { ExamenesService, ESTADOS_EXAMEN } from '../../../services/examenes';
import { AlumnosService } from '../../../services/alumnos';
import { NotificationService } from '../../../services/notification';
import { RefreshService } from '../../../services/refresh';
import { AuthService } from '../../../services/auth';
import { calcularCuentaRegresiva, dosDigitos as padDos, formatearFechaLarga } from '../../../utils/cuentaRegresiva';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar, PAGE_SIZE } from '../../../utils/paginacion';
import { NOMBRE_ESCUELA } from '../../../utils/academia';

interface TarjetaExamen {
  examen: Examen;
  cuenta: ReturnType<typeof calcularCuentaRegresiva>;
  // Estado guardado o reloj, el queSea. La plantilla lo usa para decidir si
  // muestra el reloj o el aviso, y no solo el reloj.
  terminada: boolean;
  puedeInscribirse: boolean;
  motivoBloqueo: string;
}

@Component({
  selector: 'app-alumno-examenes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './alumno-examenes.html',
  styleUrl: './alumno-examenes.scss',
})
export class AlumnoExamenes implements OnInit, OnDestroy {
  private examenesService = inject(ExamenesService);
  private alumnosService = inject(AlumnosService);
  private notificationService = inject(NotificationService);
  private refreshService = inject(RefreshService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  private subscriptions = new Subscription();

  // Un solo signal de "ahora" para todos los relojes. Cada segundo se actualiza
  // una vez y los contadores de todas las tarjetas se recalculan contra el, en
  // vez de tener un temporizador por examen que se desincroniza al segundo tic.
  private ahora = signal(Date.now());

  examenes = signal<Examen[]>([]);

  // Fechas ya formateadas en su propio computed. Si se calcularan dentro de
  // `tarjetas` se reharían en cada tic del reloj, y Intl no es barato; este
  // computed no lee `ahora` así que solo corre cuando cambia la lista.
  fechasTexto = computed(() => {
    const mapa = new Map<number, string>();
    for (const examen of this.examenes()) {
      mapa.set(examen.id, formatearFechaLarga(examen.fechaExamen));
    }
    return mapa;
  });

  cargando = signal(true);
  errorCarga = signal('');
  filtro = signal<'proximos' | 'todos'>('proximos');
  procesando = signal<number | null>(null);
  pagina = signal(1);

  visiblesPagina = computed(() => paginar(this.visibles(), this.pagina()));

  // Tarjetas con el reloj ya resuelto para el instante actual. Al leer
  // this.ahora() el computed se invalida solo en cada tic.
  tarjetas = computed<TarjetaExamen[]>(() => {
    const ahora = this.ahora();
    // Solo el alumno se inscribe. La ruta no restringe por rol (la lista es
    // publica para cualquier sesion iniciada, igual que becas), asi que un
    // profesor que llegara aqui veria la informacion pero no el boton: el
    // backend resolveria su alumno_id y no encontraria registro.
    const esAlumno = this.authService.currentUser()?.rol === 'estudiante';

    return this.examenes().map(examen => {
      const cuenta = calcularCuentaRegresiva(examen.fechaExamen, ahora);

      // El estado guardado manda igual que la fecha. Con solo mirar el reloj, un
      // examen marcado "finalizado" por el entrenador aparecia con "Inscribirme"
      // y el backend lo rechazaba con un 400: el boton prometia algo que no iba
      // a pasar.
      const cancelado = examen.estado === 'cancelado';
      const yaFue = examen.estado === 'finalizado' || examen.estado === 'en_curso';
      const terminada = yaFue || cuenta.terminado;
      const lleno = examen.cupoMaximo != null && examen.inscritos >= examen.cupoMaximo;

      let puedeInscribirse = esAlumno && !terminada && !cancelado && !lleno;

      let motivoBloqueo = '';
      if (cancelado) motivoBloqueo = 'Este examen fue cancelado';
      else if (terminada) motivoBloqueo = yaFue ? 'Este examen ya se lleva a cabo' : 'Ya se llevó a cabo';
      else if (lleno) motivoBloqueo = 'Cupo lleno';

      return { examen, cuenta, terminada, puedeInscribirse, motivoBloqueo };
    });
  });

  // "Próximos" es la pestaña por defecto y esconde lo que ya no admite
  // inscripción. Si no quedara nada, caeria al estado vacío siempre y no habria
  // forma de consultar el historial, así que cae a mostrar todo.
  visibles = computed(() => {
    const todas = this.tarjetas();
    if (this.filtro() === 'proximos') {
      const vigentes = todas.filter(t => t.examen.estado !== 'cancelado' && !t.terminada);
      return vigentes.length > 0 ? vigentes : todas;
    }
    return todas;
  });

  // Solo cuando no hay NADA vigente pero si historial. Comparar longitudes no
  // sirve: con tres examenes próximos visibles() tambien trae los tres, y el
  // aviso apareceria en cada carga.
  mostrandoTodosPorFallo = computed(() => {
    if (this.filtro() !== 'proximos') {
      return false;
    }
    const tarjetas = this.tarjetas();
    const vigentes = tarjetas.filter(t => t.examen.estado !== 'cancelado' && !t.terminada);
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

    this.examenesService.loadAll().subscribe({
      next: (data) => {
        this.examenes.set(data);
        this.cargando.set(false);
        this.errorCarga.set('');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.examenes.set([]);
        this.cargando.set(false);
        this.errorCarga.set(
          err?.status === 0
            ? 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'
            : err?.error?.message || 'No se pudieron cargar los examenes.'
        );
        this.cdr.detectChanges();
      },
    });
  }

  // --- Inscripción ---

  // Cancelar es una accion de un toque: no hay nada que confirmar. Inscribirse
  // abre el formulario, porque el backend exige los datos del alumno.
  toggleInscripcion(examen: Examen): void {
    if (this.procesando() !== null) {
      return;
    }

    if (examen.miInscripcion) {
      this.procesando.set(examen.id);
      this.examenesService.cancelarInscripcion(examen.id).subscribe({
        next: () => {
          this.procesando.set(null);
          this.notificationService.success('Inscripción cancelada');
        },
        error: (err) => {
          this.procesando.set(null);
          this.notificationService.error(err?.error?.message || 'No se pudo cancelar la inscripción.');
        },
      });
      return;
    }

    this.abrirModalInscripcion(examen);
  }

  // ── Hoja de inscripcion ───────────────────────────────────────────────────

  descargandoHoja = signal<number | null>(null);

  // El PDF se pide con HttpClient y no con un <a href> por dos razones: la ruta
  // es privada y necesita el token de la cabecera, y el nombre del archivo lo
  // decide el backend segun el nombre del examen. Con <a> el navegador bajaria
  // un archivo sin nombre o se comeria el 401.
  descargarHoja(examen: Examen): void {
    if (this.descargandoHoja() !== null) {
      return;
    }

    this.descargandoHoja.set(examen.id);
    this.examenesService.descargarHoja(examen.id).subscribe({
      next: ({ blob, nombreArchivo }) => {
        this.descargandoHoja.set(null);
        this.guardarComo(blob, nombreArchivo);
      },
      error: () => {
        // OJO: la peticion va con responseType 'blob', asi que un 404 con
        // {"message": "..."} llega como un Blob y no como objeto. Por eso
        // `err.error.message` daria undefined y por eso el texto es fijo: es lo
        // unico que se puede decir con certeza cuando la respuesta vino
        // encapsulada.
        this.descargandoHoja.set(null);
        this.notificationService.error('No se pudo descargar la hoja de inscripción.');
      },
    });
  }

  // La URL del objeto se revoca SIEMPRE, no solo en el camino feliz: cada una
  // retiene los varios MB del PDF en memoria mientras la pestana viva, y
  // descargar dos veces en una sesion larga deja el telefono sin memoria.
  //
  // Pero NO se puede revocar en el acto. `enlace.click()` arranca la descarga de
  // forma asincrona: si la URL se libera en la linea siguiente, Firefox y Safari
  // cancelan el archivo a mitad de camino. Por eso se espera un instante.
  private guardarComo(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  showModalInscripcion = signal(false);
  examenParaInscribir = signal<Examen | null>(null);
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
  abrirModalInscripcion(examen: Examen): void {
    this.examenParaInscribir.set(examen);
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoPerfil.set(false);
        // No es un error bloqueante: el alumno puede escribirlo a mano.
        this.cdr.detectChanges();
      },
    });
  }

  cerrarModalInscripcion(): void {
    if (this.enviandoInscripcion()) {
      return;
    }
    this.showModalInscripcion.set(false);
    this.examenParaInscribir.set(null);
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
    if (!d.segundoApellido.trim()) return 'Escribe tu apellido materno';
    if (!d.grado.trim()) return 'Escribe tu grado';
    // La escuela no se valida: la pone la academia en cada apertura y el input
    // va bloqueado, asi que el alumno no tiene como dejarla vacia.

    // La edad es obligatoria, asi que `null` ya no es "no la escribio" sino un
    // dato faltante: se valida siempre, no solo cuando viene algo.
    if (d.edad === null) return 'Escribe tu edad';
    if (!Number.isInteger(d.edad)) return 'Ingresa una edad válida';
    if (d.edad < 4 || d.edad > 99) return 'Ingresa una edad válida (entre 4 y 99)';

    return '';
  }

  confirmarInscripcion(): void {
    const examen = this.examenParaInscribir();
    if (!examen || this.enviandoInscripcion()) {
      return;
    }

    const error = this.validarInscripcion();
    if (error) {
      this.errorInscripcion.set(error);
      // El aviso va en los dos lugares a proposito. La alerta dice QUE hay que
      // hacer, y el mensaje del formulario dice QUE campo falta: con "datos
      // incompletos" solo, el alumno tiene que adivinar cual de los cinco le
      // quedo en blanco.
      this.notificationService.warning('Datos incompletos, por favor completa los datos');
      return;
    }

    this.enviandoInscripcion.set(true);
    this.errorInscripcion.set('');
    this.procesando.set(examen.id);

    this.examenesService.inscribirse(examen.id, this.datos()).subscribe({
      next: () => {
        this.enviandoInscripcion.set(false);
        this.procesando.set(null);
        this.showModalInscripcion.set(false);
        this.examenParaInscribir.set(null);
        // Se limpian los datos: la escuela o el grado pueden cambiar para el
        // siguiente torneo, y arrastrar el valor viejo invita al error.
        this.datos.set(this.datosVacios());
        this.notificationService.success(`Te inscribiste a ${examen.nombre}`);
      },
      error: (err) => {
        this.enviandoInscripcion.set(false);
        this.procesando.set(null);
        this.errorInscripcion.set(err?.error?.message || 'No se pudo completar la inscripción.');
        this.cdr.detectChanges();
      },
    });
  }

  // --- Utilidades de plantilla ---

  // Se expone como metodo y no como computed: depende del argumento de la
  // tarjeta, no de un estado unico del componente.
  dosDigitos(valor: number): string {
    return padDos(valor);
  }

  // El badge del encabezado muestra el ESTADO, no el tipo: un examen no tiene
  // tipo (en Eventos esa pastilla distinguia torneo de dual meet) y lo que el
  // alumno necesita ver de un vistazo es si todavia puede inscribirse o ya paso.
  estadoEtiqueta(estado: Examen['estado']): string {
    return ESTADOS_EXAMEN.find(e => e.valor === estado)?.etiqueta || estado;
  }

  // `!= null` y no `=== null`: el mapper devuelve null cuando no hay cupo, pero
  // un JSON viejo sin el campo llega undefined y con la comparacion estricta el
  // examen se renderizaba con "/ undefined" y "NaN lugares".
  plazasRestantes(examen: Examen): number | null {
    if (examen.cupoMaximo == null) {
      return null;
    }
    return Math.max(0, examen.cupoMaximo - examen.inscritos);
  }

  setFiltro(valor: 'proximos' | 'todos'): void {
    this.filtro.set(valor);
    this.pagina.set(1);
  }
}
