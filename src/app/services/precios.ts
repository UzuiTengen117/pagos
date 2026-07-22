import { Injectable, signal } from '@angular/core';
import { Precio } from '../models/precio.model';

@Injectable({ providedIn: 'root' })
export class PreciosService {
  private precios = signal<Precio[]>([
    { id: 1, concepto: 'Mensualidad Regular', monto: 1500, tipo: 'mensualidad' },
    { id: 2, concepto: 'Semanal Regular', monto: 750, tipo: 'semanal' },
    { id: 3, concepto: 'Inscripción', monto: 500, tipo: 'otro' },
    { id: 4, concepto: 'Mensualidad Becado 50%', monto: 750, tipo: 'mensualidad' },
    { id: 5, concepto: 'Mensualidad Becado 100%', monto: 0, tipo: 'mensualidad' },
  ]);

  getAll(): Precio[] {
    return this.precios();
  }

  create(precio: Omit<Precio, 'id'>): void {
    const newPrecio: Precio = {
      ...precio,
      id: this.precios().length + 1,
    };
    this.precios.update(list => [...list, newPrecio]);
  }

  update(precio: Precio): void {
    this.precios.update(list => list.map(p => (p.id === precio.id ? precio : p)));
  }

  delete(id: number): void {
    this.precios.update(list => list.filter(p => p.id !== id));
  }
}
