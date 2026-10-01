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
import * as XLSX from 'xlsx';
import { AsistenciasService } from '../../services/asistencias';
import { AlumnosService } from '../../services/alumnos';
import { AuthService } from '../../services/auth';
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
  private authService = inject(AuthService);
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
  fechaDesde = '';
  fechaHasta = '';

  sesionSeleccionada: SesionClase | null = null;
  alumnosDetalle: AlumnoEnSesion[] = [];
  cargandoDetalle = false;

  sesionAEliminar: SesionClase | null = null;
  eliminando = false;

  // El backend restringe el borrado a administradores, pero el boton tambien
  // se oculta: asi el profesor no ve un control que le va a fallar.
  get esAdmin(): boolean {
    return this.authService.currentUser()?.rol === 'administrador';
  }

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
        this.cdr.markForCheck();
      },
      error: () => {
        // El reporte no depende de esta lista para existir; degrada sin total esperado.
        this.alumnos.set([]);
        this.cdr.markForCheck();
      },
    });
  }

  private cargarSesiones(): void {
    this.cargando = true;
    this.asistenciasService.getSesiones().subscribe({
      next: (sesiones) => {
        this.sesiones.set(sesiones);
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (e: HttpErrorResponse) => {
        this.sesiones.set([]);
        this.cargando = false;
        this.error = this.explicarError(e);
        this.cdr.markForCheck();
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

  // Como la clase es por sede, se espera a todos los alumnos de esa sede. Solo
  // se acota por grado en las clases heredadas, que si eran de un solo grupo.
  totalEsperadosDe(sesion: SesionClase): number {
    const deGrado = sesion.grado && sesion.grado.toLowerCase() !== 'todos';
    return this.alumnos().filter(
      (a) => a.sede === sesion.sede && (!deGrado || a.grado === sesion.grado)
    ).length;
  }

  get sesionesFiltradas(): SesionClase[] {
    const desde = this.diaDe(this.fechaDesde);
    const hasta = this.diaDe(this.fechaHasta);

    return this.sesiones().filter((s) => {
      if (this.filtroSede && s.sede !== this.filtroSede) return false;
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
    return Boolean(this.filtroSede || this.fechaDesde || this.fechaHasta);
  }

  aplicarFiltros(): void {
    this.pagina = 1;
  }

  limpiarFiltros(): void {
    this.filtroSede = '';
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
    this.cdr.markForCheck();

    this.asistenciasService.loadAlumnosSesion(sesion.id).subscribe({
      next: (lista) => {
        this.alumnosDetalle = lista;
        this.cargandoDetalle = false;
        this.cdr.markForCheck();
      },
      error: (e: HttpErrorResponse) => {
        this.alumnosDetalle = [];
        this.cargandoDetalle = false;
        this.cdr.markForCheck();
        this.cdr.markForCheck();
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

  // Excel no acepta ciertos caracteres en nombres de archivo ni de hoja, y el
  // grado/sede son texto libre en este sistema: hay que sanearlos o el archivo
  // se descarga corrupto o con el nombre que el navegador decide.
  private sanea(texto: string): string {
    return (texto || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 40);
  }

  descargarDetalleExcel(): void {
    const sesion = this.sesionSeleccionada;
    if (!sesion || this.alumnosDetalle.length === 0) return;

    const datos = this.alumnosDetalle.map(a => ({
      'Alumno': `${a.nombre} ${a.primerApellido} ${a.segundoApellido}`.trim(),
      'Grado': a.grado,
      'Sede': a.sede,
      'Asistio': a.asistenciaId !== null ? 'Si' : 'No',
      'Hora de registro': a.registradoAt
        ? new Date(a.registradoAt).toLocaleString('es-MX')
        : '-',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');

    ws['!cols'] = [
      { wch: 34 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 20 },
    ];

    const nombre = [
      'asistencia',
      this.sanea(sesion.grado),
      this.sanea(sesion.sede),
      this.diaDe(sesion.fecha),
    ].filter(Boolean).join('_');

    XLSX.writeFile(wb, `${nombre}.xlsx`);
    this.cdr.markForCheck();
    this.notificationService.success('Lista de asistencia descargada');
  }

  abrirConfirmacionEliminar(sesion: SesionClase): void {
    this.sesionAEliminar = sesion;
  }

  cerrarConfirmacion(): void {
    if (this.eliminando) return;
    this.sesionAEliminar = null;
  }

  confirmarEliminar(): void {
    const sesion = this.sesionAEliminar;
    if (!sesion || this.eliminando) return;

    this.eliminando = true;
    this.asistenciasService.deleteSesion(sesion.id).subscribe({
      next: (res) => {
        this.eliminando = false;
        this.sesionAEliminar = null;
        this.cerrarDetalle();
        this.pagina = 1;
        this.cargarSesiones();
        this.cdr.markForCheck();
        this.notificationService.success(res.message);
      },
      error: (e: HttpErrorResponse) => {
        this.eliminando = false;
        this.cdr.markForCheck();
        this.cdr.markForCheck();
        this.notificationService.error(
          e?.error?.message || 'No se pudo eliminar la clase'
        );
      },
    });
  }
}
