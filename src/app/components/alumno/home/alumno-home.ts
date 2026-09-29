import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { EventosService } from '../../../services/eventos';
import { RefreshService } from '../../../services/refresh';
import { Pago } from '../../../models/pago.model';
import { Evento } from '../../../models/evento.model';
import { EventoAviso } from './evento-aviso';

@Component({
  selector: 'app-alumno-home',
  standalone: true,
  imports: [CommonModule, EventoAviso],
  templateUrl: './alumno-home.html',
  styleUrl: './alumno-home.scss',
})
export class AlumnoHome implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private eventosService = inject(EventosService);
  private refreshService = inject(RefreshService);
  private refreshSub?: Subscription;

  currentUser = this.authService.currentUser;

  // Alimenta el modal de aviso. Es un signal y no el cache del servicio para
  // que el aviso se reevalue solo: si despues se recarga la lista, un getter
  // normal no volveria a disparar el computed del modal.
  eventos = signal<Evento[]>([]);

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
    // El listado de eventos es publico para cualquier sesion iniciada, asi que
    // no necesita permiso. Un fallo aqui no debe romper el resumen de pagos: por
    // eso se traga el error y deja la lista vacia, que es lo mismo que "no hay
    // nada que avisar".
    this.eventosService.loadAll().subscribe({
      next: lista => this.eventos.set(lista),
      error: () => this.eventos.set([]),
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
