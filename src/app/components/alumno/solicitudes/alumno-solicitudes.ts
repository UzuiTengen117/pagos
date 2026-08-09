import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';
import { ReembolsosService } from '../../../services/reembolsos';
import { RefreshService } from '../../../services/refresh';
import { SolicitudReembolso } from '../../../models/reembolso.model';

@Component({
  selector: 'app-alumno-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './alumno-solicitudes.html',
  styleUrl: './alumno-solicitudes.scss',
})
export class AlumnoSolicitudes implements OnInit, OnDestroy {
  private reembolsosService = inject(ReembolsosService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  pagina = 1;
  cargando = false;
  solicitudes: SolicitudReembolso[] = [];

  ngOnInit(): void {
    this.loadSolicitudes();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadSolicitudes());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadSolicitudes(): void {
    this.cargando = true;
    this.reembolsosService.loadAll().subscribe({
      next: (data) => {
        this.solicitudes = data;
        this.pagina = 1;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.solicitudes = [];
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  get solicitudesPagina(): SolicitudReembolso[] {
    return paginar(this.solicitudes, this.pagina);
  }
}
