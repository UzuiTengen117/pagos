import { Injectable, signal } from '@angular/core';
import { Pago } from '../models/pago.model';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private pagos = signal<Pago[]>([
    { id: 1, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 1500, concepto: 'Mensualidad Enero', fechaPago: new Date('2026-01-15'), estado: 'pagado', semana: 3, mes: 'Enero' },
    { id: 2, alumnoId: 2, alumnoNombre: 'Juan Pérez', monto: 750, concepto: 'Semanal Semana 2', fechaPago: new Date('2026-01-10'), estado: 'pagado', semana: 2, mes: 'Enero' },
    { id: 3, alumnoId: 3, alumnoNombre: 'Ana Torres', monto: 1500, concepto: 'Mensualidad Enero', fechaPago: new Date('2026-01-20'), estado: 'pendiente', semana: 4, mes: 'Enero' },
    { id: 4, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 1500, concepto: 'Mensualidad Febrero', fechaPago: new Date('2026-02-05'), estado: 'pagado', semana: 1, mes: 'Febrero' },
    { id: 5, alumnoId: 4, alumnoNombre: 'Pedro López', monto: 750, concepto: 'Semanal Semana 3', fechaPago: new Date('2026-02-15'), estado: 'vencido', semana: 3, mes: 'Febrero' },
    { id: 6, alumnoId: 2, alumnoNombre: 'Juan Pérez', monto: 1500, concepto: 'Mensualidad Febrero', fechaPago: new Date('2026-02-20'), estado: 'pagado', semana: 4, mes: 'Febrero' },
    { id: 7, alumnoId: 5, alumnoNombre: 'Laura Díaz', monto: 1500, concepto: 'Mensualidad Marzo', fechaPago: new Date('2026-03-01'), estado: 'pagado', semana: 1, mes: 'Marzo' },
    { id: 8, alumnoId: 3, alumnoNombre: 'Ana Torres', monto: 750, concepto: 'Semanal Semana 1', fechaPago: new Date('2026-03-05'), estado: 'pendiente', semana: 1, mes: 'Marzo' },
    { id: 9, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 750, concepto: 'Semanal Semana 2', fechaPago: new Date('2026-03-12'), estado: 'pagado', semana: 2, mes: 'Marzo' },
    { id: 10, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 1500, concepto: 'Mensualidad Marzo', fechaPago: new Date('2026-03-01'), estado: 'pagado', semana: 1, mes: 'Marzo' },
    { id: 11, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 1500, concepto: 'Mensualidad Abril', fechaPago: new Date('2026-04-05'), estado: 'pagado', semana: 2, mes: 'Abril' },
    { id: 12, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 1500, concepto: 'Mensualidad Mayo', fechaPago: new Date('2026-05-03'), estado: 'pagado', semana: 1, mes: 'Mayo' },
    { id: 13, alumnoId: 1, alumnoNombre: 'María Hernández', monto: 1500, concepto: 'Mensualidad Junio', fechaPago: new Date('2026-06-08'), estado: 'pendiente', semana: 2, mes: 'Junio' },
  ]);

  getAll(): Pago[] {
    return this.pagos();
  }

  filtrarPorNombre(nombre: string): Pago[] {
    if (!nombre) return this.pagos();
    return this.pagos().filter(p =>
      p.alumnoNombre.toLowerCase().includes(nombre.toLowerCase())
    );
  }

  filtrarPorFechas(fechaInicio: Date, fechaFin: Date): Pago[] {
    return this.pagos().filter(p => {
      const fecha = new Date(p.fechaPago);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });
  }

  getResumen() {
    const pagos = this.pagos();
    const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((sum, p) => sum + p.monto, 0);
    const pendientes = pagos.filter(p => p.estado === 'pendiente').length;
    const vencidos = pagos.filter(p => p.estado === 'vencido').length;

    const gananciasPorSemana: { [key: number]: number } = {};
    const gananciasPorMes: { [key: string]: number } = {};

    pagos.filter(p => p.estado === 'pagado').forEach(p => {
      gananciasPorSemana[p.semana] = (gananciasPorSemana[p.semana] || 0) + p.monto;
      gananciasPorMes[p.mes] = (gananciasPorMes[p.mes] || 0) + p.monto;
    });

    return {
      totalPagado,
      totalRegistros: pagos.length,
      pendientes,
      vencidos,
      gananciasPorSemana,
      gananciasPorMes,
    };
  }

  create(pago: Omit<Pago, 'id'>): void {
    const newPago: Pago = {
      ...pago,
      id: this.pagos().length + 1,
    };
    this.pagos.update(list => [...list, newPago]);
  }

  update(pago: Pago): void {
    this.pagos.update(list => list.map(p => (p.id === pago.id ? pago : p)));
  }

  delete(id: number): void {
    this.pagos.update(list => list.filter(p => p.id !== id));
  }
}
