import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { EventosService } from '../../../services/eventos';
import { ExamenesService } from '../../../services/examenes';
import { RefreshService } from '../../../services/refresh';
import { Pago } from '../../../models/pago.model';
import { Aviso, avisosDisponibles, eventoAAviso, examenAAviso } from '../../../models/aviso.model';
import { AvisoModal } from './aviso';

@Component({
  selector: 'app-alumno-home',
  standalone: true,
  imports: [CommonModule, AvisoModal],
  templateUrl: './alumno-home.html',
  styleUrl: './alumno-home.scss',
})
export class AlumnoHome implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private eventosService = inject(EventosService);
  private examenesService = inject(ExamenesService);
  private refreshService = inject(RefreshService);
  private refreshSub?: Subscription;

  currentUser = this.authService.currentUser;

  // Alimenta los modales de aviso. Son dos signals y no uno porque las dos listas
  // llegan por peticiones independientes y en orden no garantizado: acumular con
  // set+update en un solo signal hacia que, si eventos responde despues de
  // examenes, su set borrara los avisos de examenes. Cada modulo escribe en el
  // suyo, y el orden de respuesta da igual. No se concatenan: cada modal recibe
  // la suya para poder encadenarlos en la plantilla.
  avisosEventos = signal<Aviso[]>([]);
  avisosExamenes = signal<Aviso[]>([]);

  // Torneos y examenes se avisan por separado, uno detras del otro, y no
  // apilados: dos overlays encima del otro se leen como uno solo, y el alumno no
  // puede cerrarlos de a uno. Cada modulo se destapa cuando el anterior ya quedo
  // atras.
  //
  // El "¿ya hay algo que avisar?" se decide con `avisosDisponibles` y no
  // preguntando por el tamano de la lista cruda, porque esa lista tiene tres
  // salidas distintas que hay que separar: todavia no llego (no se puede tapar la
  // pantalla, porque el alumno no tendria forma de quitarla nunca), llego vacia
  // (no hay nada que avisar) y llego con cosas que el filtro deja afuera (tampoco
  // hay nada que avisar).
  private eventosAvisados = signal(false);
  private examenesAvisados = signal(false);

  hayAvisosEventos = computed(() => avisosDisponibles(this.avisosEventos()).length > 0);
  hayAvisosExamenes = computed(() => avisosDisponibles(this.avisosExamenes()).length > 0);

  // El modal de examenes se destapa cuando el de torneos ya quedo descartado:
  // porque el alumno lo cerro, o porque resulto no tener nada que avisar. Ese
  // segundo caso es el que obliga a mirar `hayAvisosEventos` y no un simple "el
  // de examenes todavia no sale": las dos listas llegan por peticiones
  // independientes, asi que examenes puede contestar primero, y con la condicion
  // simplista el alumno se quedaria mirando un home sin ningun aviso y los
  // examenes no se mostrarian nunca.
  mostrarAvisoEventos = computed(() => this.hayAvisosEventos() && !this.eventosAvisados());
  mostrarAvisoExamenes = computed(
    () =>
      !this.mostrarAvisoEventos() &&
      !this.examenesAvisados() &&
      this.hayAvisosExamenes()
  );

  // Cada `cerrado` del modal marca el suyo como visto y destapa el que sigue.
  // No se encadena con un setTimeout: no hace falta esperar entre uno y otro
  // porque son modales distintos, y el segundo solo se pinta cuando el primero
  // ya desaparecio del DOM.
  cerrarAvisoEventos(): void {
    this.eventosAvisados.set(true);
  }

  cerrarAvisoExamenes(): void {
    this.examenesAvisados.set(true);
  }

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.pagosService.loadAll().subscribe();
    this.alumnosService.loadAll().subscribe();
    this.cargarAvisos();
  }

  // Los listados de eventos y examenes son publicos para cualquier sesion
  // iniciada, asi que no necesitan permiso. Un fallo en cualquiera de los dos no
  // debe romper el resumen de pagos, y tampoco debe tapar los avisos del otro
  // modulo: por eso cada uno se carga por separado y solo se traga su propio
  // error. Si el backend de examenes todavia no esta desplegado, el alumno sigue
  // viendo los avisos de los torneos.
  private cargarAvisos(): void {
    this.eventosService.loadAll().subscribe({
      next: lista => this.avisosEventos.set(lista.map(eventoAAviso)),
      error: () => this.avisosEventos.set([]),
    });
    this.examenesService.loadAll().subscribe({
      next: lista => this.avisosExamenes.set(lista.map(examenAAviso)),
      error: () => this.avisosExamenes.set([]),
    });
  }

  get misPagos(): Pago[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.username === usuario.username || a.email === usuario.email
    );
    if (!alumno) return [];
    return this.pagosService.getAll().filter(p => p.alumnoId === alumno.id);
  }

  get totalPagado(): number {
    return this.misPagos
      .filter(p => p.estado === 'pagado')
      .reduce((sum, p) => sum + p.monto, 0);
  }

  get pendientes(): number {
    return this.misPagos.filter(p => p.estado === 'pendiente').length;
  }

  get vencidos(): number {
    return this.misPagos.filter(p => p.estado === 'vencido').length;
  }

  get pagosPorMes(): { mes: string; monto: number }[] {
    const agrupado: { [key: string]: number } = {};
    this.misPagos
      .filter(p => p.estado === 'pagado')
      .forEach(p => {
        const key = p.mes || 'Sin mes';
        agrupado[key] = (agrupado[key] || 0) + p.monto;
      });
    return Object.entries(agrupado).map(([mes, monto]) => ({ mes, monto }));
  }

  getBarWidth(value: number): number {
    const max = Math.max(...this.pagosPorMes.map(p => p.monto), 0);
    return max > 0 ? (value / max) * 100 : 0;
  }
}
