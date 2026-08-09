import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';
import { AuthService } from '../../../services/auth';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { InscripcionesService } from '../../../services/inscripciones';
import { RefreshService } from '../../../services/refresh';
import { Pago } from '../../../models/pago.model';
import { Inscripcion } from '../../../models/inscripcion.model';

@Component({
  selector: 'app-alumno-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './alumno-pagos.html',
  styleUrl: './alumno-pagos.scss',
})
export class AlumnoPagos implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private inscripcionesService = inject(InscripcionesService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  currentUser = this.authService.currentUser;
  filtroFechaInicio = '';
  filtroFechaFin = '';
  paginaPagos = 1;
  paginaInscripciones = 1;

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.alumnosService.loadAll().subscribe(() => {
      this.inscripcionesService.loadAll().subscribe(() => {
        this.pagosService.loadAll().subscribe(() => {
          this.cdr.detectChanges();
        });
      });
    });
  }

  get misPagos(): Pago[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.usuarioId === usuario.id
    );
    if (!alumno) return [];
    let pagos = this.pagosService.getAll().filter(p => p.alumnoId === alumno.id);

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      pagos = pagos.filter(p => {
        const fecha = new Date(p.fechaPago);
        return fecha >= inicio && fecha <= fin;
      });
    }

    return pagos;
  }

  get misPagosPagina(): Pago[] {
    return paginar(this.misPagos, this.paginaPagos);
  }

  get misInscripciones(): Inscripcion[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.usuarioId === usuario.id
    );
    if (!alumno) return [];
    let inscripciones = this.inscripcionesService.getAll().filter(
      i => i.alumnoId === alumno.id
    );

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      inscripciones = inscripciones.filter(i => {
        const fecha = new Date(i.fechaInscripcion);
        return fecha >= inicio && fecha <= fin;
      });
    }

    return inscripciones;
  }

  get misInscripcionesPagina(): Inscripcion[] {
    return paginar(this.misInscripciones, this.paginaInscripciones);
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.paginaPagos = 1;
    this.paginaInscripciones = 1;
  }
}
