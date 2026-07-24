import { Injectable, signal } from '@angular/core';
import { Alumno } from '../models/alumno.model';

@Injectable({ providedIn: 'root' })
export class AlumnosService {
  private alumnos = signal<Alumno[]>([
    { id: 1, nombre: 'María', primerApellido: 'Hernández', segundoApellido: 'Ruiz', username: 'alumno1', email: 'maria@email.com', telefono: '5551234567', grado: '3ro', fechaInscripcion: new Date('2025-09-01'), beca: 0, activo: true },
    { id: 2, nombre: 'Juan', primerApellido: 'Pérez', segundoApellido: 'Gómez', username: 'juan_perez', email: 'juan@email.com', telefono: '5552345678', grado: '1ro', fechaInscripcion: new Date('2025-09-15'), beca: 50, activo: true },
    { id: 3, nombre: 'Ana', primerApellido: 'Torres', segundoApellido: 'Sánchez', username: 'ana_torres', email: 'ana@email.com', telefono: '5553456789', grado: '5to', fechaInscripcion: new Date('2025-10-01'), beca: 0, activo: true },
    { id: 4, nombre: 'Pedro', primerApellido: 'López', segundoApellido: 'Díaz', username: 'pedro_lopez', email: 'pedro@email.com', telefono: '5554567890', grado: '2do', fechaInscripcion: new Date('2025-10-15'), beca: 100, activo: true },
    { id: 5, nombre: 'Laura', primerApellido: 'Díaz', segundoApellido: 'Morales', username: 'laura_diaz', email: 'laura@email.com', telefono: '5555678901', grado: '4to', fechaInscripcion: new Date('2025-11-01'), beca: 50, activo: true },
  ]);

  getAll(): Alumno[] {
    return this.alumnos();
  }

  getById(id: number): Alumno | undefined {
    return this.alumnos().find(a => a.id === id);
  }

  getBecados50(): Alumno[] {
    return this.alumnos().filter(a => a.beca === 50);
  }

  getBecados100(): Alumno[] {
    return this.alumnos().filter(a => a.beca === 100);
  }

  create(alumno: Omit<Alumno, 'id'>): void {
    const newAlumno: Alumno = {
      ...alumno,
      id: this.alumnos().length + 1,
    };
    this.alumnos.update(list => [...list, newAlumno]);
  }

  update(alumno: Alumno): void {
    this.alumnos.update(list => list.map(a => (a.id === alumno.id ? alumno : a)));
  }

  delete(id: number): void {
    this.alumnos.update(list => list.filter(a => a.id !== id));
  }
}
