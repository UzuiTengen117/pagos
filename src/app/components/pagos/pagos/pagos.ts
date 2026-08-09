import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaginacionComponent } from '../../paginacion/paginacion';
import { paginar } from '../../../utils/paginacion';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { BecasService } from '../../../services/becas';
import { PreciosService } from '../../../services/precios';
import { RefreshService } from '../../../services/refresh';
import { Pago } from '../../../models/pago.model';
import { Alumno } from '../../../models/alumno.model';
import { Beca } from '../../../models/beca.model';
import { Precio } from '../../../models/precio.model';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss',
})
export class Pagos implements OnInit, OnDestroy {
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private becasService = inject(BecasService);
  private preciosService = inject(PreciosService);
  private refreshService = inject(RefreshService);
  private cdr = inject(ChangeDetectorRef);
  private refreshSub?: Subscription;

  pagos: Pago[] = [];
  alumnos: Alumno[] = [];
  becas: Beca[] = [];
  precios: Precio[] = [];
  pagina = 1;
  preciosDisponibles: { id: number; concepto: string; monto: number; tipo: string; montoConBeca: number }[] = [];
  filtroNombre = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';
  showMesesDropdown = false;
  mensajeError = '';
  mensajeExito = '';

  showModal = false;
  showDeleteModal = false;
  isEditing = false;
  pagoToDelete: Pago | null = null;

  formData: {
    alumnoId: number | null;
    precioId: number | null;
    tipoPago: 'mensualidad' | 'semanal' | 'diario';
    concepto: string;
    monto: number;
    montoOriginal: number;
    becaPorcentaje: number;
    semana: number;
    mesesSeleccionados: string[];
    mes: string;
    estado: 'pagado' | 'pendiente' | 'vencido';
    esPagoParcial: boolean;
    montoParcial: number;
    notasPendiente: string;
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
  } = this.getEmptyForm();

  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  ngOnInit(): void {
    this.loadData();
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadData());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private loadData(): void {
    this.pagosService.loadAll().subscribe({
      next: (pagosData) => {
        this.pagos = pagosData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando pagos:', err);
        this.pagos = [];
        this.mensajeError = 'Error al cargar los pagos. Verifica tu sesion.';
        this.cdr.detectChanges();
      }
    });

    this.alumnosService.loadAll().subscribe({
      next: (alumnosData) => {
        this.alumnos = alumnosData;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando alumnos:', err);
        this.alumnos = [];
        this.cdr.detectChanges();
      }
    });

    this.becasService.loadAll().subscribe({
      next: (becasData) => {
        this.becas = becasData;
        this.cdr.detectChanges();
      },
      error: () => {
        this.becas = [];
      }
    });

    this.preciosService.loadAll().subscribe({
      next: (preciosData) => {
        this.precios = preciosData.filter(p => !p.concepto.toLowerCase().includes('inscripcion'));
        this.cdr.detectChanges();
      },
      error: () => {
        this.precios = [];
      }
    });
  }

  getEmptyForm() {
    return {
      alumnoId: null as number | null,
      precioId: null as number | null,
      tipoPago: 'mensualidad' as 'mensualidad' | 'semanal' | 'diario',
      concepto: '',
      monto: 0,
      montoOriginal: 0,
      becaPorcentaje: 0,
      semana: 1,
      mesesSeleccionados: [] as string[],
      mes: 'Enero',
      estado: 'pendiente' as 'pagado' | 'pendiente' | 'vencido',
      esPagoParcial: false,
      montoParcial: 0,
      notasPendiente: '',
      metodoPago: 'efectivo' as 'efectivo' | 'transferencia' | 'tarjeta',
    };
  }

  onAlumnoChange(): void {
    if (!this.formData.alumnoId) {
      this.preciosDisponibles = [];
      this.formData.precioId = null;
      this.formData.monto = 0;
      this.formData.montoOriginal = 0;
      this.formData.becaPorcentaje = 0;
      this.formData.concepto = '';
      this.formData.tipoPago = 'mensualidad';
      this.formData.semana = 1;
      this.formData.mesesSeleccionados = [];
      this.formData.mes = 'Enero';
      this.cdr.detectChanges();
      return;
    }

    const alumno = this.alumnosService.getById(this.formData.alumnoId);
    this.formData.becaPorcentaje = alumno?.beca ?? 0;
    this.preciosDisponibles = this.pagosService.getPreciosDisponibles(this.formData.alumnoId);
    this.formData.precioId = null;
    this.formData.monto = 0;
    this.formData.montoOriginal = 0;
    this.formData.concepto = '';
    this.cdr.detectChanges();
  }

  onTipoPagoSelect(precioId: number): void {
    if (!precioId) return;

    const precio = this.precios.find(p => p.id === precioId);
    if (!precio) return;

    this.formData.precioId = precioId;
    this.formData.tipoPago = precio.tipo === 'semanal' ? 'semanal' : precio.tipo === 'otro' ? 'diario' : 'mensualidad';
    this.formData.semana = 1;
    this.formData.mesesSeleccionados = [];
    if (this.formData.tipoPago === 'diario') {
      this.formData.mes = '';
    }
    this.onPrecioChange();
    this.actualizarConcepto();
    this.cdr.detectChanges();
  }

  onTipoPagoChange(): void {
    this.formData.semana = 1;
    this.formData.mesesSeleccionados = [];
    if (this.formData.tipoPago === 'diario') {
      this.formData.mes = '';
    }
    this.autoSeleccionarPrecio();
    this.actualizarConcepto();
    this.cdr.detectChanges();
  }

  private autoSeleccionarPrecio(): void {
    if (!this.formData.alumnoId) return;

    const precioAutomatico = this.precios.find(p => {
      if (this.formData.tipoPago === 'mensualidad') {
        return p.tipo === 'mensualidad';
      }
      if (this.formData.tipoPago === 'semanal') {
        return p.tipo === 'semanal';
      }
      if (this.formData.tipoPago === 'diario') {
        return p.tipo === 'otro';
      }
      return false;
    });

    if (precioAutomatico) {
      this.formData.precioId = precioAutomatico.id;
      this.onPrecioChange();
    }
  }

  private actualizarConcepto(): void {
    if (!this.formData.precioId) return;
    const precio = this.precios.find(p => p.id === this.formData.precioId);
    if (!precio) return;

    if (this.formData.tipoPago === 'semanal') {
      this.formData.concepto = `Semanal Semana ${this.formData.semana} ${this.formData.mes}`;
    } else if (this.formData.tipoPago === 'diario') {
      this.formData.concepto = `Diario ${this.formData.semana} ${this.formData.semana === 1 ? 'dia' : 'dias'}`;
    } else {
      if (this.formData.mesesSeleccionados.length > 0) {
        this.formData.concepto = `${precio.concepto} ${this.formData.mesesSeleccionados.join(', ')}`;
      } else {
        this.formData.concepto = `${precio.concepto} ${this.formData.mes}`;
      }
    }
  }

  onPrecioChange(): void {
    if (!this.formData.alumnoId || !this.formData.precioId) {
      this.formData.monto = 0;
      this.formData.montoOriginal = 0;
      this.formData.concepto = '';
      return;
    }

    const resultado = this.pagosService.calcularMonto(this.formData.alumnoId, this.formData.precioId);
    const multiplicador = this.formData.tipoPago === 'mensualidad'
      ? (this.formData.mesesSeleccionados.length || 1)
      : this.formData.tipoPago === 'diario'
        ? (this.formData.semana || 1)
        : (this.formData.semana || 1);

    this.formData.montoOriginal = resultado.montoOriginal * multiplicador;
    this.formData.monto = resultado.monto * multiplicador;
    this.formData.becaPorcentaje = resultado.becaPorcentaje;
  }

  toggleMes(mes: string): void {
    const idx = this.formData.mesesSeleccionados.indexOf(mes);
    if (idx >= 0) {
      this.formData.mesesSeleccionados.splice(idx, 1);
    } else {
      this.formData.mesesSeleccionados.push(mes);
    }
    this.onPrecioChange();
    this.actualizarConcepto();
    this.cdr.detectChanges();
  }

  isMesSelected(mes: string): boolean {
    return this.formData.mesesSeleccionados.includes(mes);
  }

  toggleMesesDropdown(): void {
    this.showMesesDropdown = !this.showMesesDropdown;
    this.cdr.detectChanges();
  }

  closeMesesDropdown(): void {
    this.showMesesDropdown = false;
    this.cdr.detectChanges();
  }

  getMesesSeleccionadosText(): string {
    if (this.formData.mesesSeleccionados.length === 0) return 'Seleccionar meses';
    if (this.formData.mesesSeleccionados.length === 1) return this.formData.mesesSeleccionados[0];
    return `${this.formData.mesesSeleccionados.length} meses seleccionados`;
  }

  onSemanaChange(): void {
    if (this.formData.precioId) {
      this.onPrecioChange();
      this.actualizarConcepto();
      this.cdr.detectChanges();
    }
  }

  onMesChange(): void {
    this.actualizarConcepto();
    this.cdr.detectChanges();
  }

  togglePagoParcial(): void {
    if (!this.formData.esPagoParcial) {
      this.formData.montoParcial = 0;
    } else {
      this.formData.estado = 'pendiente';
    }
    this.cdr.detectChanges();
  }

  togglePendienteNotas(): void {
    if (this.formData.estado !== 'pendiente') {
      this.formData.notasPendiente = '';
    }
    this.cdr.detectChanges();
  }

  getAlumnoBeca(alumnoId: number | null): string {
    if (!alumnoId) return '';
    const alumno = this.alumnosService.getById(alumnoId);
    if (!alumno || alumno.beca === 0) return 'Sin beca';
    return `Beca ${alumno.beca}%`;
  }

  get pagosPagina(): Pago[] {
    return paginar(this.pagos, this.pagina);
  }

  aplicarFiltros(): void {
    this.pagina = 1;
    let resultado = this.pagosService.getAll();

    if (this.filtroNombre) {
      const termino = this.filtroNombre.toLowerCase();
      resultado = resultado.filter(p =>
        p.alumnoNombre.toLowerCase().includes(termino)
      );
    }

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      resultado = resultado.filter(p => {
        const fecha = new Date(p.fechaPago);
        return fecha >= inicio && fecha <= fin;
      });
    }

    this.pagos = resultado;
    this.cdr.detectChanges();
  }

  limpiarFiltros(): void {
    this.pagina = 1;
    this.filtroNombre = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.pagosService.loadAll().subscribe({
      next: (data) => {
        this.pagos = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.pagos = [];
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.showModal = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.showMesesDropdown = false;
    this.cdr.detectChanges();
  }

  private detectarTipoPago(concepto: string, precioId: number | null): 'mensualidad' | 'semanal' | 'diario' {
    const precio = precioId ? this.precios.find(p => p.id === precioId) : null;
    if (precio?.tipo === 'semanal') return 'semanal';
    if (precio?.tipo === 'otro') return 'diario';
    if (precio?.tipo === 'mensualidad') return 'mensualidad';
    if (concepto.toLowerCase().includes('semanal')) return 'semanal';
    if (concepto.toLowerCase().includes('diario')) return 'diario';
    return 'mensualidad';
  }

  openEditModal(pago: Pago): void {
    const tipoPago = this.detectarTipoPago(pago.concepto, pago.precioId);
    this.formData = {
      alumnoId: pago.alumnoId,
      precioId: pago.precioId,
      tipoPago,
      concepto: pago.concepto,
      monto: pago.monto,
      montoOriginal: pago.montoOriginal,
      becaPorcentaje: pago.becaPorcentaje,
      semana: pago.semana,
      mesesSeleccionados: pago.mes ? pago.mes.split(', ').filter(m => m.trim()) : [],
      mes: tipoPago === 'diario' ? '' : (pago.mes || ''),
      estado: pago.estado,
      esPagoParcial: !!(pago.montoParcial && pago.montoParcial > 0 && pago.montoParcial < pago.monto),
      montoParcial: pago.montoParcial ?? 0,
      notasPendiente: pago.notasPendiente ?? '',
      metodoPago: 'efectivo',
    };
    this.isEditing = true;
    this.pagoToDelete = pago;
    this.preciosDisponibles = this.pagosService.getPreciosDisponibles(pago.alumnoId);
    this.showModal = true;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.pagoToDelete = null;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.showMesesDropdown = false;
    this.cdr.detectChanges();
  }

  savePago(): void {
    this.mensajeError = '';

    if (!this.formData.alumnoId) {
      this.mensajeError = 'Selecciona un alumno.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.formData.concepto.trim()) {
      this.mensajeError = 'Ingresa un concepto.';
      this.cdr.detectChanges();
      return;
    }
    if (!this.formData.precioId) {
      this.mensajeError = 'Selecciona un tipo de pago.';
      this.cdr.detectChanges();
      return;
    }
    if (this.formData.monto <= 0) {
      this.mensajeError = 'El monto debe ser mayor a 0.';
      this.cdr.detectChanges();
      return;
    }
    if (this.formData.esPagoParcial && (this.formData.montoParcial <= 0 || this.formData.montoParcial > this.formData.monto)) {
      this.mensajeError = 'El monto parcial debe ser mayor a 0 y menor o igual al monto total.';
      this.cdr.detectChanges();
      return;
    }

    const alumnoId = Number(this.formData.alumnoId);
    const alumno = this.alumnosService.getById(alumnoId);
    if (!alumno) {
      this.mensajeError = 'El alumno seleccionado no es válido.';
      this.cdr.detectChanges();
      return;
    }

    const estadoFinal = this.formData.esPagoParcial ? 'pendiente' : this.formData.estado;

    const mesFinal = this.formData.tipoPago === 'mensualidad' && this.formData.mesesSeleccionados.length > 0
      ? this.formData.mesesSeleccionados.join(', ')
      : this.formData.tipoPago === 'diario'
        ? '-'
        : this.formData.mes;

    const pagoData = {
      alumnoId: alumno.id,
      alumnoNombre: `${alumno.nombre} ${alumno.primerApellido}`,
      monto: Number(this.formData.monto),
      montoOriginal: Number(this.formData.montoOriginal),
      concepto: this.formData.concepto,
      fechaPago: new Date(),
      estado: estadoFinal,
      semana: Number(this.formData.semana),
      mes: mesFinal,
      becaPorcentaje: this.formData.becaPorcentaje,
      precioId: Number(this.formData.precioId),
      montoParcial: this.formData.esPagoParcial ? Number(this.formData.montoParcial) : undefined,
      notasPendiente: this.formData.notasPendiente.trim() || undefined,
    };

    const operation = this.isEditing && this.pagoToDelete
      ? this.pagosService.update({ ...pagoData, id: this.pagoToDelete.id })
      : this.pagosService.create(pagoData, this.formData.metodoPago);

    operation.subscribe({
      next: (response) => {
        if (this.isEditing) {
          this.mensajeExito = 'Pago actualizado correctamente.';
        } else if (response?.comprobante) {
          this.mensajeExito = 'Pago registrado y comprobante generado automaticamente.';
        } else {
          this.mensajeExito = 'Pago registrado correctamente.';
        }
        this.cdr.detectChanges();
        setTimeout(() => {
          this.closeModal();
          this.recargarPagos();
        }, 800);
      },
      error: (err) => {
        console.error('Error guardando pago:', err);
        this.mensajeError = err.error?.message || 'Error al guardar el pago. Intenta de nuevo.';
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteModal(pago: Pago): void {
    this.pagoToDelete = pago;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.pagoToDelete = null;
    this.cdr.detectChanges();
  }

  deletePago(): void {
    if (!this.pagoToDelete) return;

    this.pagosService.delete(this.pagoToDelete.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.recargarPagos();
      },
      error: (err) => {
        console.error('Error eliminando pago:', err);
        this.mensajeError = err.error?.message || 'Error al eliminar el pago.';
        this.closeDeleteModal();
        this.cdr.detectChanges();
      }
    });
  }

  private recargarPagos(): void {
    this.pagina = 1;
    this.pagosService.loadAll().subscribe({
      next: (data) => {
        this.pagos = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error recargando pagos:', err);
        this.pagos = [];
        this.cdr.detectChanges();
      }
    });
  }

  descargarExcel(): void {
    const datos = this.pagos.map(p => ({
      'ID': p.id,
      'Alumno': p.alumnoNombre,
      'Beca': p.becaPorcentaje > 0 ? `${p.becaPorcentaje}%` : '-',
      'Concepto': p.concepto,
      'Precio Original': p.montoOriginal,
      'Monto Final': p.montoParcial && p.montoParcial > 0 && p.montoParcial < p.monto ? p.montoParcial : p.monto,
      'Fecha': new Date(p.fechaPago).toLocaleDateString('es-MX'),
      'Semana': p.semana,
      'Mes': p.mes,
      'Estado': p.estado.charAt(0).toUpperCase() + p.estado.slice(1),
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 8 },
      { wch: 30 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
    ];

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `pagos_resumen_${fecha}.xlsx`);
  }
}
