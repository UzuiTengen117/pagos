import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { ComprobantesService } from '../../../services/comprobantes';
import { BecasService } from '../../../services/becas';
import { AuthService } from '../../../services/auth';
import { RefreshService } from '../../../services/refresh';
import { Pago } from '../../../models/pago.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private comprobantesService = inject(ComprobantesService);
  private becasService = inject(BecasService);
  private authService = inject(AuthService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  resumen = this.pagosService.getResumen();
  totalAlumnos = 0;
  becas: { nombre: string; porcentaje: number; cantidad: number }[] = [];
  totalComprobantes = 0;
  currentUser = this.authService.currentUser;

  showDateModal = false;
  showConfirmModal = false;
  filtroFechaInicio = '';
  filtroFechaFin = '';
  mensajeError = '';
  fechasConfirmadas = { inicio: '', fin: '' };

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.pagosService.loadAll().subscribe({
      next: () => {
        this.resumen = this.pagosService.getResumen();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });

    this.alumnosService.loadAll().subscribe({
      next: (alumnos) => {
        this.totalAlumnos = alumnos.length;
        this.cdr.detectChanges();

        this.becasService.loadAll().subscribe({
          next: (becasData) => {
            this.becas = becasData.map(b => ({
              nombre: b.nombre,
              porcentaje: b.porcentaje,
              cantidad: alumnos.filter(a => a.becaId === b.id).length,
            }));
            this.cdr.detectChanges();
          },
          error: () => {}
        });
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });

    this.comprobantesService.loadAll().subscribe({
      next: (data) => {
        this.totalComprobantes = data.length;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  getGananciasSemanaEntries(): [string, number][] {
    return Object.entries(this.resumen.gananciasPorSemana) as [string, number][];
  }

  getGananciasMesEntries(): [string, number][] {
    return Object.entries(this.resumen.gananciasPorMes) as [string, number][];
  }

  getBarWidth(value: number): number {
    const vals = Object.values(this.resumen.gananciasPorSemana);
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    return max > 0 ? (value / max) * 100 : 0;
  }

  getBarWidthMes(value: number): number {
    const vals = Object.values(this.resumen.gananciasPorMes);
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    return max > 0 ? (value / max) * 100 : 0;
  }

  openDownloadModal(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.mensajeError = '';
    this.showDateModal = true;
    this.cdr.detectChanges();
  }

  closeDateModal(): void {
    this.showDateModal = false;
    this.mensajeError = '';
    this.cdr.detectChanges();
  }

  aceptarFechas(): void {
    this.mensajeError = '';

    if (!this.filtroFechaInicio || !this.filtroFechaFin) {
      this.mensajeError = 'Selecciona una fecha de inicio y una fecha de fin.';
      this.cdr.detectChanges();
      return;
    }

    if (this.filtroFechaInicio > this.filtroFechaFin) {
      this.mensajeError = 'La fecha de inicio no puede ser mayor que la fecha de fin.';
      this.cdr.detectChanges();
      return;
    }

    this.fechasConfirmadas = {
      inicio: this.filtroFechaInicio,
      fin: this.filtroFechaFin,
    };
    this.showDateModal = false;
    this.showConfirmModal = true;
    this.cdr.detectChanges();
  }

  cancelarConfirmacion(): void {
    this.showConfirmModal = false;
    this.cdr.detectChanges();
  }

  confirmarDescarga(): void {
    this.descargarExcelGanancias();
    this.showConfirmModal = false;
    this.cdr.detectChanges();
  }

  formatFecha(fecha: string): string {
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX');
  }

  descargarExcelGanancias(): void {
    const inicio = new Date(this.fechasConfirmadas.inicio + 'T00:00:00');
    const fin = new Date(this.fechasConfirmadas.fin + 'T23:59:59');

    const pagos = this.pagosService.getAll().filter((p: Pago) => {
      if (p.estado !== 'pagado') return false;
      if (p.concepto && p.concepto.toLowerCase().includes('inscripcion')) return false;
      const fecha = new Date(p.fechaPago);
      return fecha >= inicio && fecha <= fin;
    });

    const comprobantes = this.comprobantesService.getAll();
    const inscripciones = comprobantes.filter(c => {
      if (!c.concepto || !c.concepto.toLowerCase().includes('inscripcion')) return false;
      const fecha = new Date(c.fechaEmision);
      return fecha >= inicio && fecha <= fin;
    });

    const aoa: any[][] = [];

    aoa.push(['GANANCIAS DE PAGOS']);
    aoa.push(['ID', 'Alumno', 'Beca', 'Concepto', 'Precio Original', 'Monto Final', 'Fecha', 'Semana', 'Mes']);
    pagos.forEach(p => {
      aoa.push([
        p.id,
        p.alumnoNombre,
        p.becaPorcentaje > 0 ? `${p.becaPorcentaje}%` : '-',
        p.concepto,
        p.montoOriginal,
        p.montoParcial && p.montoParcial > 0 && p.montoParcial < p.monto ? p.montoParcial : p.monto,
        new Date(p.fechaPago).toLocaleDateString('es-MX'),
        p.semana,
        p.mes,
      ]);
    });
    const totalPagos = pagos.reduce((sum, p) => sum + (p.montoParcial && p.montoParcial > 0 && p.montoParcial < p.monto ? p.montoParcial : p.monto), 0);
    aoa.push(['TOTAL GANANCIAS DE PAGOS', '', '', '', '', totalPagos]);
    aoa.push([]);

    aoa.push(['GANANCIAS DE INSCRIPCIONES']);
    if (inscripciones.length > 0) {
      aoa.push(['Folio', 'Alumno', 'Concepto', 'Monto', 'Fecha', 'Metodo de Pago']);
      inscripciones.forEach(c => {
        aoa.push([
          c.folio,
          c.alumnoNombre,
          c.concepto,
          c.monto,
          new Date(c.fechaEmision).toLocaleDateString('es-MX'),
          (c.metodoPago || 'efectivo').charAt(0).toUpperCase() + (c.metodoPago || 'efectivo').slice(1),
        ]);
      });
      const totalInscripciones = inscripciones.reduce((sum, c) => sum + c.monto, 0);
      aoa.push(['TOTAL GANANCIAS DE INSCRIPCIONES', '', '', totalInscripciones]);
      aoa.push([]);
    }

    const totalGeneral = aoa
      .filter(fila => String(fila[0]).startsWith('TOTAL'))
      .reduce((sum, fila) => {
        for (let i = fila.length - 1; i >= 0; i--) {
          const v = fila[i];
          if (v !== '' && v !== undefined && v !== null && !isNaN(Number(v))) {
            return sum + Number(v);
          }
        }
        return sum;
      }, 0);
    aoa.push(['TOTAL GENERAL', '', '', '', '', totalGeneral]);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(aoa);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ganancias');

    ws['!cols'] = [
      { wch: 24 },
      { wch: 30 },
      { wch: 10 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
    ];

    XLSX.writeFile(wb, `ganancias_${this.fechasConfirmadas.inicio}_${this.fechasConfirmadas.fin}.xlsx`);
  }
}
