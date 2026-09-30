import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, filter } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { Examen, ExamenFormData, ExamenInscrito, EstadoExamen } from '../../../models/examen.model';
import { ExamenesService, ESTADOS_EXAMEN, SEDES_EXAMEN } from '../../../services/examenes';
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
// esta academia, y por eso los chips no ofrecen niveles que el entrenador
// no puede arbitrar.
const CINTAS = ['Blanca', 'Naranja', 'Amarilla', 'Verde', 'Marrón', 'Roja', 'Negra'];

// Normaliza una lista separada por comas al alternar un elemento. Sirve para
// sedes y para cintas porque hacen lo mismo: agregar si no esta, quitar si ya
// esta.
//
// Antes el click sobre una cinta solo AGREGABA, nunca quitaba y permitia
// duplicar ("Blanca, Blanca"). Este es un toggle de verdad: el mismo click que
// agrega la quita, y comparar en minusculas evita que "blanca" y "Blanca"
// convivan como dos niveles distintas.
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
  selector: 'app-examenes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './examenes.html',
  styleUrl: './examenes.scss',
})
export class Examenes implements OnInit, OnDestroy {
  private examenesService = inject(ExamenesService);
  private notificationService = inject(NotificationService);
  private refreshService = inject(RefreshService);
  private permisosService = inject(PermisosService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  private subscriptions = new Subscription();

  readonly estados = ESTADOS_EXAMEN;
  // Lista cerrada de sedes: son las unicas dos donde se aplica un examen, asi que
  // se ofrecen como chips (se pueden marcar varias) y no como sugerencias.
  readonly sedes = SEDES_EXAMEN;
  // Sugerencias de cinta. A diferencia de las sedes, esta lista NO es cerrada: el
  // campo de texto acepta cualquier nivel para el caso de que la academia abra
  // una cinta nueva que el catalogo todavia no conoce.
  readonly cintas = CINTAS;

  examenes = signal<Examen[]>([]);
  cargando = signal(true);
  pagina = signal(1);
  busqueda = signal('');
  // El equivalente a `eventos.filtroTipo`. Un examen no tiene `tipo` (eso
  // clasifica como se juega un torneo), asi que lo que se filtra es la cinta que
  // se examina, que es el mismo trabajo: recortar la lista a un subconjunto que
  // el administrador elige del catalogo.
  filtroNivel = signal<string>('todos');
  filtroEstado = signal<'todos' | EstadoExamen>('todos');

  // Un solo signal de reloj para toda la columna de cuentas regresivas. Antes se
  // llamaba a Date.now() desde la plantilla, que solo se reevalua cuando cambia
  // otra cosa: los chips se quedaban congelados en el primer render.
  private ahora = signal(Date.now());

  // --- Modal de alta / edición ---
  showModal = signal(false);
  isEditing = signal(false);
  form = signal<ExamenFormData>(this.formVacio());
  formError = signal('');
  guardando = signal(false);
  examenEditandoId = signal<number | null>(null);

  // --- Imagen ---
  imagenPreview = signal('');
  imagenSeleccionada = signal<File | null>(null);
  quitandoImagen = signal(false);

  // Hoja de inscripcion en PDF. A diferencia de la imagen no hay vista previa:
  // el navegador no puede mostrar un PDF dentro de un <img>, y meter un <embed>
  // en el formulario abre una segunda vista previa que hay que sincronizar con
  // la que se sube. Se muestra el nombre del archivo, que es lo que el admin
  // necesita para confirmar que eligio el correcto.
  hojaSeleccionada = signal<File | null>(null);
  // Si el examen YA tiene una hoja guardada en el servidor. Va separado de
  // `hojaSeleccionada` porque son dos cosas distintas: una es lo que hay en la
  // base, la otra lo que el admin acaba de elegir y aun no se ha subido. Con un
  // solo signal no se podria mostrar "ya hay un PDF, sustituir?" sin adivinar.
  hojaGuardada = signal(false);
  quitandoHoja = signal(false);

  // --- Modal de borrado ---
  showDeleteModal = signal(false);
  examenToDelete = signal<Examen | null>(null);

  // --- Modal de inscritos ---
  showInscritosModal = signal(false);
  inscritos = signal<ExamenInscrito[]>([]);
  inscritosExamen = signal<Examen | null>(null);
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
    this.cargarExamenes();

    this.subscriptions.add(interval(1000).subscribe(() => this.ahora.set(Date.now())));
    this.subscriptions.add(
      this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.cargarExamenes())
    );
    this.subscriptions.add(this.refreshService.refresh$.subscribe(() => this.cargarExamenes()));
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
        this.puedeCrear.set(lista.includes('examenes:crear:examenes'));
        this.puedeEditar.set(lista.includes('examenes:editar:examenes'));
        this.puedeEliminar.set(lista.includes('examenes:eliminar:examenes'));
        this.puedeVerInscritos.set(lista.includes('examenes:ver:reporte_examenes'));
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

  cargarExamenes(): void {
    this.cargando.set(true);
    this.examenesService.loadAll().subscribe({
      next: (data) => {
        this.examenes.set(data);
        this.cargando.set(false);
        this.clampPagina();
        this.cdr.detectChanges();
      },
      error: () => {
        this.examenes.set([]);
        this.cargando.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  // Al borrar o filtrar, la pagina actual puede quedar mas alla del rango y la
  // tabla se dibuja vacia sin avisar.
  private clampPagina(): void {
    const maximo = Math.max(1, Math.ceil(this.examenesFiltrados().length / 10));
    if (this.pagina() > maximo) {
      this.pagina.set(maximo);
    }
  }

  // --- Filtros ---

  examenesFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const nivel = this.filtroNivel();
    const estado = this.filtroEstado();

    return this.examenes().filter(e => {
      // El examen guarda las cintas en una lista separada por comas ("Blanca,
      // Amarilla"), asi que el filtro tiene que buscar dentro de la lista y no
      // comparar la cadena entera: con igualdad fallaria en cuanto un examen
      // tuviera mas de una cinta.
      if (nivel !== 'todos' && !this.tieneNivel(e, nivel)) return false;
      // Se compara contra el estado VISIBLE, no contra el guardado: un examen
      // "programado" cuya fecha ya paso se muestra como finalizado, asi que el
      // filtro tiene que contar igual que la etiqueta o el usuario no lo
      // encuentra en "Finalizados".
      if (estado !== 'todos' && this.estadoVisible(e) !== estado) return false;
      if (!texto) return true;

      return (
        e.nombre.toLowerCase().includes(texto) ||
        e.lugar.toLowerCase().includes(texto) ||
        e.niveles.toLowerCase().includes(texto) ||
        e.sede.toLowerCase().includes(texto)
      );
    });
  });

  examenesPagina = computed(() => paginar(this.examenesFiltrados(), this.pagina()));

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroNivel.set('todos');
    this.filtroEstado.set('todos');
    this.pagina.set(1);
  }

  // --- Formulario ---

  formVacio(): ExamenFormData {
    return {
      nombre: '',
      estado: 'programado',
      fechaExamenLocal: '',
      sede: '',
      lugar: '',
      niveles: '',
      descripcion: '',
      precioInscripcion: 0,
      cupoMaximo: null,
    };
  }

  openCreateModal(): void {
    this.form.set(this.formVacio());
    this.isEditing.set(false);
    this.examenEditandoId.set(null);
    this.imagenPreview.set('');
    this.imagenSeleccionada.set(null);
    this.hojaSeleccionada.set(null);
    this.hojaGuardada.set(false);
    this.formError.set('');
    this.showModal.set(true);
  }

  openEditModal(examen: Examen): void {
    this.form.set({
      nombre: examen.nombre,
      estado: examen.estado,
      fechaExamenLocal: isoAFechaLocal(examen.fechaExamen),
      sede: examen.sede,
      lugar: examen.lugar,
      niveles: examen.niveles,
      descripcion: examen.descripcion,
      precioInscripcion: examen.precioInscripcion,
      cupoMaximo: examen.cupoMaximo,
    });
    this.isEditing.set(true);
    this.examenEditandoId.set(examen.id);
    this.imagenPreview.set(examen.imagen);
    this.imagenSeleccionada.set(null);
    this.hojaSeleccionada.set(null);
    this.hojaGuardada.set(examen.tieneHoja);
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.formError.set('');
    this.imagenSeleccionada.set(null);
    this.hojaSeleccionada.set(null);
  }

  actualizar<K extends keyof ExamenFormData>(campo: K, valor: ExamenFormData[K]): void {
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

  // Alterna una cinta en la lista de niveles.
  alternarCinta(cinta: string): void {
    this.actualizar('niveles', alternarEnLista(this.form().niveles, cinta));
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
    if (!f.nombre.trim()) return 'Ingresa el nombre del examen.';
    if (f.nombre.trim().length > 255) return 'El nombre no puede superar 255 caracteres.';
    if (!f.fechaExamenLocal) return 'Selecciona la fecha y hora de inicio.';

    // La fecha futura solo se exige al crear. Si se exigiera al editar, un
    // torneo de ayer quedaria sin poder corregir un typo en el nombre, y es
    // justo el examen que mas necesita una correction.
    if (this.isEditing() === false && new Date(f.fechaExamenLocal).getTime() <= Date.now()) {
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

    // Sede opcional: un examen de alcance general puede no tener sede fija. Si
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
    const id = this.examenEditandoId();
    // Se captura ahora: al resolver los adjuntos el modal ya puede haberse
    // cerrado y leer el signal daria el mensaje del verbo equivocado.
    const eraEdicion = this.isEditing();

    const peticion = id === null
      ? this.examenesService.create(payload)
      : this.examenesService.update(id, payload);

    peticion.subscribe({
      next: (guardado: Examen) => {
        // Los adjuntos van DESPUES de crear, porque sus rutas necesitan el id
        // que solo existe tras el INSERT. Se delega el cierre del modal y el
        // aviso de exito ahi, para que haya un solo lugar que decide cuando
        // termina todo, sin importar cuantas descargas se hayan hecho.
        this.subirAdjuntos(guardado.id, eraEdicion);
      },
      error: (err) => {
        this.guardando.set(false);
        this.formError.set(err?.error?.message || 'Error al guardar el examen.');
        this.cdr.detectChanges();
      },
    });
  }

  // La foto y la hoja se suben en serie, no en paralelo. Si las dos fallaran al
  // mismo tiempo, con dos avisos encimados encima del modal se pierde de vista
  // cual de los dos fue el error real. Ademas el backend tiene un limite de
  // conexiones y dos subidas de varios MB a la vez en un despliegue serverless es
  // la forma rapida de que una se corte.
  private async subirAdjuntos(id: number, eraEdicion: boolean): Promise<void> {
    const imagen = this.imagenSeleccionada();
    const hoja = this.hojaSeleccionada();

    if (imagen) {
      const ok = await this.subirImagen(id, imagen);
      if (!ok) return;
    }

    if (hoja) {
      const ok = await this.subirHoja(id, hoja);
      if (!ok) return;
    }

    this.guardando.set(false);
    this.closeModal();
    this.notificationService.success(eraEdicion ? 'Examen actualizado correctamente.' : 'Examen creado correctamente.');
  }

  // --- Imagen ---

  onFileSelected(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    if (!archivo) return;

    const error = this.examenesService.validarImagen(archivo);
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
    const id = this.examenEditandoId();
    if (id === null) {
      // En alta todavia no hay fila: descartar el archivo elegido es todo.
      this.imagenSeleccionada.set(null);
      this.imagenPreview.set('');
      return;
    }

    this.quitandoImagen.set(true);
    this.examenesService.eliminarImagen(id).subscribe({
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

  // --- Hoja de inscripcion ---

  onHojaSelected(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    if (!archivo) return;

    const error = this.examenesService.validarHoja(archivo);
    if (error) {
      this.notificationService.error(error);
      input.value = '';
      return;
    }

    this.hojaSeleccionada.set(archivo);
    // Se limpia el input para que elegir dos veces el MISMO archivo dispare
    // `change`. Sin esto, el admin corrige el PDF equivocado, lo vuelve a
    // elegir, y no pasa nada: el navegador no emite `change` cuando el valor
    // no cambio.
    input.value = '';
    this.cdr.detectChanges();
  }

  // Igual que la imagen: quitar borra de verdad. En alta todavia no hay fila, y
  // descartar el archivo elegido es todo lo que se puede hacer.
  quitarHoja(): void {
    const id = this.examenEditandoId();
    if (id === null) {
      this.hojaSeleccionada.set(null);
      return;
    }

    this.quitandoHoja.set(true);
    this.examenesService.eliminarHoja(id).subscribe({
      next: () => {
        this.quitandoHoja.set(false);
        this.hojaSeleccionada.set(null);
        this.hojaGuardada.set(false);
        this.notificationService.success('Hoja de inscripción eliminada');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.quitandoHoja.set(false);
        this.notificationService.error(err?.error?.message || 'No se pudo eliminar la hoja de inscripción.');
      },
    });
  }

  // Devuelve si la subida funciono, en vez de cerrar el modal: el cierre lo
  // decide `subirAdjuntos`, que todavia puede tener una hoja pendiente.
  private async subirImagen(id: number, archivo: File): Promise<boolean> {
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
      return false;
    }

    return new Promise<boolean>((resolve) => {
      this.examenesService.subirImagen(id, archivo, thumb).subscribe({
        next: () => {
          this.guardando.set(false);
          resolve(true);
        },
        error: (err) => {
          this.guardando.set(false);
          this.closeModal();
          this.notificationService.error(
            err?.error?.message || 'El examen se guardó, pero la imagen no se pudo subir.'
          );
          resolve(false);
        },
      });
    });
  }

  // El PDF va crudo: sin recortar, sin thumbnail y sin previsualizar. Un PDF no
  // se renderiza igual en todos los navegadores, asi que generar una miniatura
  // seria inventar una imagen que no representa lo que el alumno va a ver al
  // abrirlo.
  private subirHoja(id: number, archivo: File): Promise<boolean> {
    this.guardando.set(true);

    return new Promise<boolean>((resolve) => {
      this.examenesService.subirHoja(id, archivo).subscribe({
        next: () => {
          this.guardando.set(false);
          this.hojaSeleccionada.set(null);
          this.hojaGuardada.set(true);
          resolve(true);
        },
        error: (err) => {
          this.guardando.set(false);
          this.closeModal();
          this.notificationService.error(
            err?.error?.message || 'El examen se guardó, pero la hoja no se pudo subir.'
          );
          resolve(false);
        },
      });
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

  openDeleteModal(examen: Examen): void {
    this.examenToDelete.set(examen);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.examenToDelete.set(null);
  }

  eliminar(): void {
    const examen = this.examenToDelete();
    if (!examen) return;

    this.examenesService.delete(examen.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.notificationService.success('Examen eliminado');
      },
      error: (err) => {
        this.closeDeleteModal();
        this.notificationService.error(err?.error?.message || 'Error al eliminar el examen.');
      },
    });
  }

  // --- Inscritos ---

  openInscritosModal(examen: Examen): void {
    this.inscritosExamen.set(examen);
    this.inscritos.set([]);
    this.cargandoInscritos.set(true);
    this.showInscritosModal.set(true);

    this.examenesService.loadInscritos(examen.id).subscribe({
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
    this.inscritosExamen.set(null);
  }

  // --- Utilidades de plantilla ---

  cuenta(examen: Examen) {
    return calcularCuentaRegresiva(examen.fechaExamen, this.ahora());
  }

  // El estado que se ve, no el guardado. Un examen "programado" con la fecha
  // pasada se muestra como finalizado: dejarlo "programado" con el reloj en
  // cero se ve como bug.
  estadoVisible(examen: Examen): EstadoExamen {
    if (examen.estado === 'cancelado' || examen.estado === 'en_curso') return examen.estado;
    if (eventoTerminado(examen.fechaExamen, this.ahora())) return 'finalizado';
    return examen.estado;
  }

  esInactivo(examen: Examen): boolean {
    const visible = this.estadoVisible(examen);
    return visible === 'finalizado' || visible === 'cancelado';
  }

  diasTexto(examen: Examen): string {
    const c = this.cuenta(examen);
    if (c.terminado) return 'Finalizado';
    if (c.dias > 0) return `${c.dias}d ${dosDigitos(c.horas)}h ${dosDigitos(c.minutos)}m`;
    return `${dosDigitos(c.horas)}:${dosDigitos(c.minutos)}:${dosDigitos(c.segundos)}`;
  }

  // `!= null` y no `=== null` en todo lo que se pinta: el mapper normaliza a
  // null, pero un JSON viejo sin el campo llega undefined y la comparacion
  // estricta renderiza "/ undefined" o "NaN lugares".
  plazasRestantes(examen: Examen): number | null {
    if (examen.cupoMaximo == null) {
      return null;
    }
    return Math.max(0, examen.cupoMaximo - examen.inscritos);
  }

  cupoLleno(examen: Examen): boolean {
    return examen.cupoMaximo != null && examen.inscritos >= examen.cupoMaximo;
  }

  examenesProximos = computed(() => this.examenes().filter(e => !this.esInactivo(e)).length);

  onSearch(value: string): void {
    this.busqueda.set(value);
    this.pagina.set(1);
  }

  onNivelChange(value: string): void {
    this.filtroNivel.set(value);
    this.pagina.set(1);
  }

  // Si una cinta concreta esta entre las del examen. La comparacion es sin
  // distincion de mayusculas por la misma razon que en `estaSeleccionado`: si
  // el usuario escribio "blanca" a mano, el filtro tiene que encontrarla igual.
  tieneNivel(examen: Examen, nivel: string): boolean {
    return examen.niveles
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .some((p) => p === nivel.toLowerCase());
  }

  onEstadoChange(value: string): void {
    this.filtroEstado.set(value as 'todos' | EstadoExamen);
    this.pagina.set(1);
  }

  nombreCompleto(inscrito: ExamenInscrito): string {
    return `${inscrito.nombre} ${inscrito.primerApellido} ${inscrito.segundoApellido}`.trim();
  }

  totalInscritos = computed(() => this.examenes().reduce((suma, e) => suma + e.inscritos, 0));
}
