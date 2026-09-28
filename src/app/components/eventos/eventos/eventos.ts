import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, filter } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { Evento, EventoFormData, EventoInscrito, TipoEvento, EstadoEvento } from '../../../models/evento.model';
import { EventosService, TIPOS_EVENTO, ESTADOS_EVENTO, SEDES_EVENTO } from '../../../services/eventos';
import { NotificationService } from '../../../services/notification';
import { RefreshService } from '../../../services/refresh';
import { PermisosService } from '../../../services/permisos';
import { AuthService } from '../../../services/auth';
import { isoAFechaLocal } from '../../../utils/mappers';
import { calcularCuentaRegresiva, dosDigitos, eventoTerminado } from '../../../utils/cuentaRegresiva';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';

// Cintas de la academia, en orden de promocion. No es la escala ITF de
// compilacion (Blanco y Amarillo, Cobre, Azul, Violeta) sino la de WTF, que es
// la que los belts de casa siguen: blanca, amarilla, naranja, verde, marron,
// roja, negra.
//
// La diferencia no es academica: un alumno que compite en "Cobre" no existe en
// esta academia, y por eso los chips no ofrecen categorias que el entrenador
// no puede arbitrar.
const CINTAS = ['Blanca', 'Naranja', 'Amarilla', 'Verde', 'Marrón', 'Roja', 'Negra'];

// Normaliza una lista separada por comas al alternar un elemento. Sirve para
// sedes y para cintas porque hacen lo mismo: agregar si no esta, quitar si ya
// esta.
//
// Antes el click sobre una cinta solo AGREGABA, nunca quitaba y permitia
// duplicar ("Blanca, Blanca"). Este es un toggle de verdad: el mismo click que
// agrega la quita, y comparar en minusculas evita que "blanca" y "Blanca"
// convivan como dos categorias distintas.
function alternarEnLista(valorActual: string, elemento: string): string {
  const partes = valorActual
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const indice = partes.findIndex((p) => p.toLowerCase() === elemento.toLowerCase());
  if (indice >= 0) {
    partes.splice(indice, 1);
  } else {
    partes.push(elemento);
  }
  return partes.join(', ');
}

// Ancho maximo del thumbnail que consume el listado. A 480px un cartel queda
// legible en la tarjeta y pesa ~40KB en vez de los 2.67MB de la original.
const THUMB_ANCHO = 480;
const THUMB_CALIDAD = 0.72;

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './eventos.html',
  styleUrl: './eventos.scss',
})
export class Eventos implements OnInit, OnDestroy {
  private eventosService = inject(EventosService);
  private notificationService = inject(NotificationService);
  private refreshService = inject(RefreshService);
  private permisosService = inject(PermisosService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  private subscriptions = new Subscription();

  readonly tipos = TIPOS_EVENTO;
  readonly estados = ESTADOS_EVENTO;
  // Lista cerrada de sedes: son las unicas dos donde se juega un torneo, asi que
  // se ofrecen como chips (se pueden marcar varias) y no como sugerencias.
  readonly sedes = SEDES_EVENTO;
  // Sugerencias de cinta, tambien de tipo chip. A diferencia de las sedes, esta
  // lista NO es cerrada: el campo de texto acepta cualquier categoria para el
  // caso de que el arbitro de un torneo abierto use una que aun no se teaches.
  readonly cintas = CINTAS;

  eventos = signal<Evento[]>([]);
  cargando = signal(true);
  pagina = signal(1);
  busqueda = signal('');
  filtroTipo = signal<'todos' | TipoEvento>('todos');
  filtroEstado = signal<'todos' | EstadoEvento>('todos');

  // Un solo signal de reloj para toda la columna de cuentas regresivas. Antes se
  // llamaba a Date.now() desde la plantilla, que solo se reevalua cuando cambia
  // otra cosa: los chips se quedaban congelados en el primer render.
  private ahora = signal(Date.now());

  // --- Modal de alta / edición ---
  showModal = signal(false);
  isEditing = signal(false);
  form = signal<EventoFormData>(this.formVacio());
  formError = signal('');
  guardando = signal(false);
  eventoEditandoId = signal<number | null>(null);

  // --- Imagen ---
  imagenPreview = signal('');
  imagenSeleccionada = signal<File | null>(null);
  quitandoImagen = signal(false);

  // --- Modal de borrado ---
  showDeleteModal = signal(false);
  eventoToDelete = signal<Evento | null>(null);

  // --- Modal de inscritos ---
  showInscritosModal = signal(false);
  inscritos = signal<EventoInscrito[]>([]);
  inscritosEvento = signal<Evento | null>(null);
  cargandoInscritos = signal(false);

  // El admin puede gestionarlos siempre. Un profesor depende de su
  // configuracion: se comprueba accion por accion y no "tengo algo del modulo",
  // porque un profesor con solo ver_inscritos no puede crear nada y un boton
  // visible que responde 403 es peor que un boton ausente.
  puedeCrear = signal(false);
  puedeEditar = signal(false);
  puedeEliminar = signal(false);
  puedeVerInscritos = signal(false);

  ngOnInit(): void {
    this.cargarPermisos();
    this.cargarEventos();

    this.subscriptions.add(interval(1000).subscribe(() => this.ahora.set(Date.now())));
    this.subscriptions.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.cargarEventos())
    );
    this.subscriptions.add(this.refreshService.refresh$.subscribe(() => this.cargarEventos()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private cargarPermisos(): void {
    if (this.authService.currentUser()?.rol === 'administrador') {
      this.puedeCrear.set(true);
      this.puedeEditar.set(true);
      this.puedeEliminar.set(true);
      this.puedeVerInscritos.set(true);
      return;
    }

    this.permisosService.getMisPermisos().subscribe({
      next: (res) => {
        const lista = res.permisos || [];
        this.puedeCrear.set(lista.includes('eventos:crear:eventos'));
        this.puedeEditar.set(lista.includes('eventos:editar:eventos'));
        this.puedeEliminar.set(lista.includes('eventos:eliminar:eventos'));
        this.puedeVerInscritos.set(lista.includes('eventos:ver:reporte_eventos'));
      },
      error: () => {
        this.puedeCrear.set(false);
        this.puedeEditar.set(false);
        this.puedeEliminar.set(false);
        this.puedeVerInscritos.set(false);
      },
    });
  }

  puedeGestionar(): boolean {
    return this.puedeCrear() || this.puedeEditar() || this.puedeEliminar();
  }

  cargarEventos(): void {
    this.cargando.set(true);
    this.eventosService.loadAll().subscribe({
      next: (data) => {
        this.eventos.set(data);
        this.cargando.set(false);
        this.clampPagina();
        this.cdr.detectChanges();
      },
      error: () => {
        this.eventos.set([]);
        this.cargando.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  // Al borrar o filtrar, la pagina actual puede quedar mas alla del rango y la
  // tabla se dibuja vacia sin avisar.
  private clampPagina(): void {
    const maximo = Math.max(1, Math.ceil(this.eventosFiltrados().length / 10));
    if (this.pagina() > maximo) {
      this.pagina.set(maximo);
    }
  }

  // --- Filtros ---

  eventosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const tipo = this.filtroTipo();
    const estado = this.filtroEstado();

    return this.eventos().filter(e => {
      if (tipo !== 'todos' && e.tipo !== tipo) return false;
      // Se compara contra el estado VISIBLE, no contra el guardado: un evento
      // "programado" cuya fecha ya paso se muestra como finalizado, asi que el
      // filtro tiene que contar igual que la etiqueta o el usuario no lo
      // encuentra en "Finalizados".
      if (estado !== 'todos' && this.estadoVisible(e) !== estado) return false;
      if (!texto) return true;

      return (
        e.nombre.toLowerCase().includes(texto) ||
        e.lugar.toLowerCase().includes(texto) ||
        e.categorias.toLowerCase().includes(texto) ||
        e.sede.toLowerCase().includes(texto)
      );
    });
  });

  eventosPagina = computed(() => paginar(this.eventosFiltrados(), this.pagina()));

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroTipo.set('todos');
    this.filtroEstado.set('todos');
    this.pagina.set(1);
  }

  // --- Formulario ---

  formVacio(): EventoFormData {
    return {
      nombre: '',
      tipo: 'torneo',
      estado: 'programado',
      fechaInicioLocal: '',
      sede: '',
      lugar: '',
      categorias: '',
      descripcion: '',
      precioInscripcion: 0,
      cupoMaximo: null,
    };
  }

  openCreateModal(): void {
    this.form.set(this.formVacio());
    this.isEditing.set(false);
    this.eventoEditandoId.set(null);
    this.imagenPreview.set('');
    this.imagenSeleccionada.set(null);
    this.formError.set('');
    this.showModal.set(true);
  }

  openEditModal(evento: Evento): void {
    this.form.set({
      nombre: evento.nombre,
      tipo: evento.tipo,
      estado: evento.estado,
      fechaInicioLocal: isoAFechaLocal(evento.fechaInicio),
      sede: evento.sede,
      lugar: evento.lugar,
      categorias: evento.categorias,
      descripcion: evento.descripcion,
      precioInscripcion: evento.precioInscripcion,
      cupoMaximo: evento.cupoMaximo,
    });
    this.isEditing.set(true);
    this.eventoEditandoId.set(evento.id);
    this.imagenPreview.set(evento.imagen);
    this.imagenSeleccionada.set(null);
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.formError.set('');
    this.imagenSeleccionada.set(null);
  }

  actualizar<K extends keyof EventoFormData>(campo: K, valor: EventoFormData[K]): void {
    this.form.update(f => ({ ...f, [campo]: valor }));
  }

  // El input type=number entrega string; se convierte en el borde para que el
  // resto del componente no tenga que castear.
  actualizarNumero(campo: 'precioInscripcion' | 'cupoMaximo', valor: string): void {
    if (campo === 'cupoMaximo') {
      this.actualizar('cupoMaximo', valor === '' ? null : Number(valor));
      return;
    }
    this.actualizar('precioInscripcion', valor === '' ? 0 : Number(valor));
  }

  // Alterna una sede en la lista. Se puede marcar mas de una: un torneo de fin
  // de semana puede organizarse en las dos a la vez.
  alternarSede(sede: string): void {
    this.actualizar('sede', alternarEnLista(this.form().sede, sede));
  }

  // Alterna una cinta en la lista de categorias.
  alternarCinta(cinta: string): void {
    this.actualizar('categorias', alternarEnLista(this.form().categorias, cinta));
  }

  // Si un chip esta marcado. Se usa la misma comparacion sin distincion de
  // mayusculas que alternarEnLista, o el chip se veria apagado con "Blanca"
  // seleccionado si el usuario lo escribio como "blanca".
  estaSeleccionado(valorActual: string, elemento: string): boolean {
    return valorActual
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .some((p) => p === elemento.toLowerCase());
  }

  validar(): string {
    const f = this.form();
    if (!f.nombre.trim()) return 'Ingresa el nombre del evento.';
    if (f.nombre.trim().length > 255) return 'El nombre no puede superar 255 caracteres.';
    if (!f.fechaInicioLocal) return 'Selecciona la fecha y hora de inicio.';

    // La fecha futura solo se exige al crear. Si se exigiera al editar, un
    // torneo de ayer quedaria sin poder corregir un typo en el nombre, y es
    // justo el evento que mas necesita una correction.
    if (this.isEditing() === false && new Date(f.fechaInicioLocal).getTime() <= Date.now()) {
      return 'La fecha de inicio debe ser futura.';
    }

    if (f.precioInscripcion !== null && f.precioInscripcion < 0) {
      return 'El precio de inscripción no puede ser negativo.';
    }
    if (f.cupoMaximo !== null && f.cupoMaximo !== undefined) {
      if (f.cupoMaximo < 1 || !Number.isInteger(f.cupoMaximo)) {
        return 'El cupo máximo debe ser un número entero mayor a 0.';
      }
      if (f.cupoMaximo > 10000) return 'El cupo máximo no puede ser mayor a 10000.';
    }

    // Sede opcional: un evento de alcance general puede no tener sede fija. Si
    // viene, cada parte de la lista tiene que ser una de las dos; validar la
    // cadena entera dejaria pasar "Progreso, Cholula" porque no es igual a
    // "Progreso". Vacio es valido y no se toca.
    if (f.sede) {
      const pedidas = f.sede.split(',').map((s) => s.trim()).filter(Boolean);
      const invalida = pedidas.find((s) => !this.sedes.includes(s));
      if (invalida) {
        return `Sede no válida: ${invalida}. Solo puedes usar ${this.sedes.join(' o ')}.`;
      }
    }
    return '';
  }

  guardar(): void {
    const error = this.validar();
    if (error) {
      this.formError.set(error);
      return;
    }

    this.formError.set('');
    this.guardando.set(true);

    const payload = this.form();
    const id = this.eventoEditandoId();
    // Se captura ahora: al resolver la imagen el modal ya puede haberse
    // cerrado y leer el signal daria el mensaje del verbo equivocado.
    const eraEdicion = this.isEditing();
    const archivo = this.imagenSeleccionada();

    const peticion = id === null
      ? this.eventosService.create(payload)
      : this.eventosService.update(id, payload);

    peticion.subscribe({
      next: (guardado: Evento) => {
        this.guardando.set(false);

        // En alta se sube la imagen despues de crear, porque la ruta de imagen
        // necesita el id que solo existe tras el INSERT.
        if (archivo) {
          this.subirImagen(guardado.id, archivo, eraEdicion);
          return;
        }

        this.notificationService.success(eraEdicion ? 'Evento actualizado correctamente.' : 'Evento creado correctamente.');
        this.closeModal();
      },
      error: (err) => {
        this.guardando.set(false);
        this.formError.set(err?.error?.message || 'Error al guardar el evento.');
        this.cdr.detectChanges();
      },
    });
  }

  // --- Imagen ---

  onFileSelected(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    if (!archivo) return;

    const error = this.eventosService.validarImagen(archivo);
    if (error) {
      this.notificationService.error(error);
      input.value = '';
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.imagenSeleccionada.set(archivo);
      this.imagenPreview.set(String(lector.result || ''));
      this.cdr.detectChanges();
    };
    lector.readAsDataURL(archivo);
    input.value = '';
  }

  // Quitar borra de verdad. Antes solo limpiaba la vista previa y el cartel
  // anterior seguia apareciendole a los alumnos.
  quitarImagen(): void {
    const id = this.eventoEditandoId();
    if (id === null) {
      // En alta todavia no hay fila: descartar el archivo elegido es todo.
      this.imagenSeleccionada.set(null);
      this.imagenPreview.set('');
      return;
    }

    this.quitandoImagen.set(true);
    this.eventosService.eliminarImagen(id).subscribe({
      next: () => {
        this.quitandoImagen.set(false);
        this.imagenSeleccionada.set(null);
        this.imagenPreview.set('');
        this.notificationService.success('Imagen eliminada');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.quitandoImagen.set(false);
        this.notificationService.error(err?.error?.message || 'No se pudo eliminar la imagen.');
      },
    });
  }

  private async subirImagen(id: number, archivo: File, eraEdicion: boolean): Promise<void> {
    this.guardando.set(true);
    let thumb: File | undefined;

    // El thumbnail se arma antes de la peticion: si la generacion falla se
    // avisa y no se manda nada, en vez de subir 2MB para acabar con un
    // listado sin foto.
    try {
      thumb = await this.generarThumbnail(archivo);
    } catch {
      this.guardando.set(false);
      this.closeModal();
      this.notificationService.error('No se pudo procesar la imagen. Intenta con otro archivo.');
      return;
    }

    this.eventosService.subirImagen(id, archivo, thumb).subscribe({
      next: () => {
        this.guardando.set(false);
        this.closeModal();
        this.notificationService.success(eraEdicion ? 'Evento actualizado correctamente.' : 'Evento creado correctamente.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.closeModal();
        this.notificationService.error(
          err?.error?.message || 'El evento se guardó, pero la imagen no se pudo subir.'
        );
      },
    });
  }

  // Recorte en el navegador. createImageBitmap decodifica fuera del hilo
  // principal, a diferencia de un <img> con FileReader, que en un celular se
  // traba al abrir un cartel de 2MP.
  private async generarThumbnail(archivo: File): Promise<File> {
    const bitmap = await createImageBitmap(archivo);
    try {
      const escala = Math.min(1, THUMB_ANCHO / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * escala));

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('canvas 2d no disponible');
      }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', THUMB_CALIDAD)
      );
      if (!blob) {
        throw new Error('toBlob devolvio null');
      }
      return new File([blob], 'cartel-thumb.jpg', { type: 'image/jpeg' });
    } finally {
      bitmap.close();
    }
  }

  // --- Borrado ---

  openDeleteModal(evento: Evento): void {
    this.eventoToDelete.set(evento);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.eventoToDelete.set(null);
  }

  eliminar(): void {
    const evento = this.eventoToDelete();
    if (!evento) return;

    this.eventosService.delete(evento.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.notificationService.success('Evento eliminado');
      },
      error: (err) => {
        this.closeDeleteModal();
        this.notificationService.error(err?.error?.message || 'Error al eliminar el evento.');
      },
    });
  }

  // --- Inscritos ---

  openInscritosModal(evento: Evento): void {
    this.inscritosEvento.set(evento);
    this.inscritos.set([]);
    this.cargandoInscritos.set(true);
    this.showInscritosModal.set(true);

    this.eventosService.loadInscritos(evento.id).subscribe({
      next: (data) => {
        this.inscritos.set(data);
        this.cargandoInscritos.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoInscritos.set(false);
        this.notificationService.error(err?.error?.message || 'No se pudo cargar la lista de inscritos.');
        this.cdr.detectChanges();
      },
    });
  }

  closeInscritosModal(): void {
    this.showInscritosModal.set(false);
    this.inscritosEvento.set(null);
  }

  // --- Utilidades de plantilla ---

  cuenta(evento: Evento) {
    return calcularCuentaRegresiva(evento.fechaInicio, this.ahora());
  }

  // El estado que se ve, no el guardado. Un evento "programado" con la fecha
  // pasada se muestra como finalizado: dejarlo "programado" con el reloj en
  // cero se ve como bug.
  estadoVisible(evento: Evento): EstadoEvento {
    if (evento.estado === 'cancelado' || evento.estado === 'en_curso') return evento.estado;
    if (eventoTerminado(evento.fechaInicio, this.ahora())) return 'finalizado';
    return evento.estado;
  }

  esInactivo(evento: Evento): boolean {
    const visible = this.estadoVisible(evento);
    return visible === 'finalizado' || visible === 'cancelado';
  }

  diasTexto(evento: Evento): string {
    const c = this.cuenta(evento);
    if (c.terminado) return 'Finalizado';
    if (c.dias > 0) return `${c.dias}d ${dosDigitos(c.horas)}h ${dosDigitos(c.minutos)}m`;
    return `${dosDigitos(c.horas)}:${dosDigitos(c.minutos)}:${dosDigitos(c.segundos)}`;
  }

  // `!= null` y no `=== null` en todo lo que se pinta: el mapper normaliza a
  // null, pero un JSON viejo sin el campo llega undefined y la comparacion
  // estricta renderiza "/ undefined" o "NaN lugares".
  plazasRestantes(evento: Evento): number | null {
    if (evento.cupoMaximo == null) {
      return null;
    }
    return Math.max(0, evento.cupoMaximo - evento.inscritos);
  }

  cupoLleno(evento: Evento): boolean {
    return evento.cupoMaximo != null && evento.inscritos >= evento.cupoMaximo;
  }

  eventosProximos = computed(() => this.eventos().filter(e => !this.esInactivo(e)).length);

  onSearch(value: string): void {
    this.busqueda.set(value);
    this.pagina.set(1);
  }

  onTipoChange(value: string): void {
    this.filtroTipo.set(value as 'todos' | TipoEvento);
    this.pagina.set(1);
  }

  onEstadoChange(value: string): void {
    this.filtroEstado.set(value as 'todos' | EstadoEvento);
    this.pagina.set(1);
  }

  nombreCompleto(inscrito: EventoInscrito): string {
    return `${inscrito.nombre} ${inscrito.primerApellido} ${inscrito.segundoApellido}`.trim();
  }

  totalInscritos = computed(() => this.eventos().reduce((suma, e) => suma + e.inscritos, 0));
}
