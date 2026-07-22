import { Injectable, signal } from '@angular/core';
import { Beca } from '../models/beca.model';

@Injectable({ providedIn: 'root' })
export class BecasService {
  private becas = signal<Beca[]>([
    { id: 1, nombre: 'Beca Académica 50%', porcentaje: 50, descripcion: 'Beca para alumnos con excelente rendimiento académico', activa: true },
    { id: 2, nombre: 'Beca Deportiva 100%', porcentaje: 100, descripcion: 'Beca completa para atletas destacados', activa: true },
  ]);

  getAll(): Beca[] {
    return this.becas();
  }

  create(beca: Omit<Beca, 'id'>): void {
    const newBeca: Beca = {
      ...beca,
      id: this.becas().length + 1,
    };
    this.becas.update(list => [...list, newBeca]);
  }

  update(beca: Beca): void {
    this.becas.update(list => list.map(b => (b.id === beca.id ? beca : b)));
  }

  delete(id: number): void {
    this.becas.update(list => list.filter(b => b.id !== id));
  }
}
