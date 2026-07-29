import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Pago } from '../models/pago.model';
import { AlumnosService } from './alumnos';
import { PreciosService } from './precios';
import { environment } from '../../environments/environment';
import { mapPagoFromBackend, mapPagoToBackend } from '../utils/mappers';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private http = inject(HttpClient);
  private alumnosService = inject(AlumnosService);
  private preciosService = inject(PreciosService);
  private apiUrl = environment.apiUrl;
  private pagos = signal<Pago[]>([]);

  loadAll(): Observable<Pago[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pagos`).pipe(
      map(data => data.map(mapPagoFromBackend)),
      map(data => {
        this.pagos.set(data);
        return data;
      })
    );
  }

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
      const key = p.mes || 'Sin mes';
      gananciasPorMes[key] = (gananciasPorMes[key] || 0) + p.monto;
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

  calcularMonto(alumnoId: number, precioId: number): { montoOriginal: number; monto: number; becaPorcentaje: number } {
    const alumno = this.alumnosService.getById(alumnoId);
    const precios = this.preciosService.getAll();
    const precio = precios.find(p => p.id === precioId);

    if (!alumno || !precio) {
      return { montoOriginal: 0, monto: 0, becaPorcentaje: 0 };
    }

    const becaPorcentaje = alumno.beca;
    const montoOriginal = precio.monto;
    const descuento = montoOriginal * (becaPorcentaje / 100);
    const monto = montoOriginal - descuento;

    return { montoOriginal, monto, becaPorcentaje };
  }

  getPreciosDisponibles(alumnoId: number): { id: number; concepto: string; monto: number; tipo: string; montoConBeca: number }[] {
    const alumno = this.alumnosService.getById(alumnoId);
    if (!alumno) return [];

    const precios = this.preciosService.getAll();
    const becaPorcentaje = alumno.beca;

    return precios.map(precio => ({
      id: precio.id,
      concepto: precio.concepto,
      monto: precio.monto,
      tipo: precio.tipo,
      montoConBeca: precio.monto - (precio.monto * (becaPorcentaje / 100)),
    }));
  }

  create(pago: Omit<Pago, 'id'>, metodoPago: string = 'efectivo'): Observable<any> {
    const body = mapPagoToBackend(pago);
    body.metodo_pago = metodoPago;
    return this.http.post<any>(`${this.apiUrl}/pagos/agregar`, body);
  }

  update(pago: Pago): Observable<any> {
    const body = mapPagoToBackend(pago);
    return this.http.put<any>(`${this.apiUrl}/pagos/editar/${pago.id}`, body);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/pagos/eliminar/${id}`);
  }
}
