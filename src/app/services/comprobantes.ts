import { Injectable, signal } from '@angular/core';
import { Comprobante } from '../models/comprobante.model';

@Injectable({ providedIn: 'root' })
export class ComprobantesService {
  private comprobantes = signal<Comprobante[]>([
    {
      id: 1,
      folio: 'COMP-2026-001',
      pagoId: 1,
      alumnoId: 1,
      alumnoNombre: 'María Hernández Ruiz',
      alumnoEmail: 'maria@email.com',
      concepto: 'Mensualidad Enero',
      monto: 1500,
      fechaEmision: new Date('2026-01-15'),
      estado: 'activo',
      metodoPago: 'efectivo',
      observaciones: 'Pago completo',
    },
    {
      id: 2,
      folio: 'COMP-2026-002',
      pagoId: 2,
      alumnoId: 2,
      alumnoNombre: 'Juan Pérez Gómez',
      alumnoEmail: 'juan@email.com',
      concepto: 'Semanal Semana 2',
      monto: 750,
      fechaEmision: new Date('2026-01-10'),
      estado: 'activo',
      metodoPago: 'transferencia',
      observaciones: '',
    },
    {
      id: 3,
      folio: 'COMP-2026-003',
      pagoId: 4,
      alumnoId: 1,
      alumnoNombre: 'María Hernández Ruiz',
      alumnoEmail: 'maria@email.com',
      concepto: 'Mensualidad Febrero',
      monto: 1500,
      fechaEmision: new Date('2026-02-05'),
      estado: 'activo',
      metodoPago: 'tarjeta',
      observaciones: 'Pago con tarjeta de débito',
    },
    {
      id: 4,
      folio: 'COMP-2026-004',
      pagoId: 9,
      alumnoId: 1,
      alumnoNombre: 'María Hernández Ruiz',
      alumnoEmail: 'maria@email.com',
      concepto: 'Semanal Semana 2',
      monto: 750,
      fechaEmision: new Date('2026-03-12'),
      estado: 'activo',
      metodoPago: 'efectivo',
      observaciones: '',
    },
    {
      id: 5,
      folio: 'COMP-2026-005',
      pagoId: 10,
      alumnoId: 1,
      alumnoNombre: 'María Hernández Ruiz',
      alumnoEmail: 'maria@email.com',
      concepto: 'Mensualidad Marzo',
      monto: 1500,
      fechaEmision: new Date('2026-03-01'),
      estado: 'activo',
      metodoPago: 'transferencia',
      observaciones: 'Pago completo',
    },
    {
      id: 6,
      folio: 'COMP-2026-006',
      pagoId: 11,
      alumnoId: 1,
      alumnoNombre: 'María Hernández Ruiz',
      alumnoEmail: 'maria@email.com',
      concepto: 'Mensualidad Abril',
      monto: 1500,
      fechaEmision: new Date('2026-04-05'),
      estado: 'activo',
      metodoPago: 'tarjeta',
      observaciones: 'Pago con tarjeta de crédito',
    },
  ]);

  private counter = 7;

  getAll(): Comprobante[] {
    return this.comprobantes();
  }

  getById(id: number): Comprobante | undefined {
    return this.comprobantes().find(c => c.id === id);
  }

  filtrarPorNombre(nombre: string): Comprobante[] {
    if (!nombre) return this.comprobantes();
    return this.comprobantes().filter(c =>
      c.alumnoNombre.toLowerCase().includes(nombre.toLowerCase())
    );
  }

  filtrarPorFechas(fechaInicio: Date, fechaFin: Date): Comprobante[] {
    return this.comprobantes().filter(c => {
      const fecha = new Date(c.fechaEmision);
      return fecha >= fechaInicio && fecha <= fechaFin;
    });
  }

  generarFolio(): string {
    const year = new Date().getFullYear();
    const num = String(this.counter).padStart(3, '0');
    return `COMP-${year}-${num}`;
  }

  create(comprobante: Omit<Comprobante, 'id' | 'folio' | 'fechaEmision'>): void {
    const newComprobante: Comprobante = {
      ...comprobante,
      id: this.comprobantes().length + 1,
      folio: this.generarFolio(),
      fechaEmision: new Date(),
    };
    this.comprobantes.update(list => [...list, newComprobante]);
    this.counter++;
  }

  cancelar(id: number): void {
    this.comprobantes.update(list =>
      list.map(c => (c.id === id ? { ...c, estado: 'cancelado' as const } : c))
    );
  }

  delete(id: number): void {
    this.comprobantes.update(list => list.filter(c => c.id !== id));
  }
}
