import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AsistenciasService } from '../../services/asistencias';
import { AlumnosService } from '../../services/alumnos';
import { NotificationService } from '../../services/notification';
import { SesionClase, AlumnoEnSesion } from '../../models/asistencia.model';
import { Alumno } from '../../models/alumno.model';
import { PaginacionComponent } from '../paginacion/paginacion';
import { paginar, PAGE_SIZE } from '../../utils/paginacion';

@Component({
  selector: 'app-reporte-asistencias',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './reporte-asistencias.html',
  styleUrl: './reporte-asistencias.scss',
})
export class ReporteAsistencias implements OnInit {
  private asistenciasService = inject(AsistenciasService);
  private alumnosService = inject(AlumnosService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  readonly pageSize = PAGE_SIZE;
  readonly sedes: string[];

  sesiones = signal<SesionClase[]>([]);
  alumnos = signal<Alumno[]>([]);
  cargando = true;
  error = '';
  pagina = 1;

  filtroSede = '';
  filtroGrado = '';
  fechaDesde = '';
  fechaHasta = '';

  sesionSeleccionada: SesionClase | null = null;
  alumnosDetalle: AlumnoEnSesion[] = [];
  cargandoDetalle = false;

  constructor() {
    this.sedes = this.asistenciasService.getSedes();
  }

  ngOnInit(): void {
    this.cargarAlumnos();
    this.cargarSesiones();
  }

  private cargarAlumnos(): void {
    this.alumnosService.loadAll().subscribe({
      next: (lista) => {
        this.alumnos.set(lista);
        this.cdr.detectChanges();
      },
      error: () => {
        // El reporte no depende de esta lista para existir; degrada sin total esperado.
        this.alumnos.set([]);
        this.cdr.detectChanges();
      },
    });
  }

  private cargarSesiones(): void {
    this.cargando = true;
    this.asistenciasService.getSesiones().subscribe({
      next: (sesiones) => {
        this.sesiones.set(sesiones);
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.sesiones.set([]);
        this.cargando = false;
        this.error = this.explicarError(e);
        this.cdr.detectChanges();
      },
    });
  }

  private explicarError(e: HttpErrorResponse): string {
    if (e.status === 0) {
      return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
    }
    if (e.status === 403) {
      return 'No tienes permiso para generar reportes de asistencia.';
    }
    return e?.error?.message || 'No se pudo cargar el reporte de asistencias.';
  }

  // `fecha` llega como ISO con hora local del servidor ("2026-09-27T06:00:00Z").
  // Tomar los primeros 10 caracteres da el dia del calendario sin depender de
  // la zona horaria del navegador, y permite comparar como texto.
  private diaDe(fecha: string | null | undefined): string {
    return (fecha || '').slice(0, 10);
  }

  get gradosDisponibles(): string[] {
    return [...new Set(this.alumnos().map((a) => a.grado))].sort((a, b) =>
      a.localeCompare(b, 'es', { numeric: true })
    );
  }

  totalEsperadosDe(grado: string, sede: string): number {
    return this.alumnos().filter((a) => a.grado === grado && a.sede === sede).length;
  }

  get sesionesFiltradas(): SesionClase[] {
    const desde = this.diaDe(this.fechaDesde);
    const hasta = this.diaDe(this.fechaHasta);

    return this.sesiones().filter((s) => {
      if (this.filtroSede && s.sede !== this.filtroSede) return false;
      if (this.filtroGrado && s.grado !== this.filtroGrado) return false;
      const dia = this.diaDe(s.fecha);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      return true;
    });
  }

  get sesionesPagina(): SesionClase[] {
    return paginar(this.sesionesFiltradas, this.pagina, this.pageSize);
  }

  get total(): number {
    return this.sesionesFiltradas.length;
  }

  get hayFiltros(): boolean {
    return Boolean(this.filtroSede || this.filtroGrado || this.fechaDesde || this.fechaHasta);
  }

  aplicarFiltros(): void {
    this.pagina = 1;
  }

  limpiarFiltros(): void {
    this.filtroSede = '';
    this.filtroGrado = '';
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.pagina = 1;
  }

  cambiarPagina(pagina: number): void {
    this.pagina = pagina;
  }

  // Cada clase se lista una vez con su conteo; el detalle se pide al abrir.
  verDetalle(sesion: SesionClase): void {
    this.sesionSeleccionada = sesion;
    this.alumnosDetalle = [];
    this.cargandoDetalle = true;
    this.cdr.detectChanges();

    this.asistenciasService.loadAlumnosSesion(sesion.id).subscribe({
      next: (lista) => {
        this.alumnosDetalle = lista;
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.alumnosDetalle = [];
        this.cargandoDetalle = false;
        this.cdr.detectChanges();
        this.notificationService.error(
          e?.error?.message || 'No se pudo cargar la lista de alumnos'
        );
      },
    });
  }

  cerrarDetalle(): void {
    this.sesionSeleccionada = null;
    this.alumnosDetalle = [];
    this.cargandoDetalle = false;
  }

  get presentesEnDetalle(): number {
    return this.alumnosDetalle.filter((a) => a.asistenciaId !== null).length;
  }
}
