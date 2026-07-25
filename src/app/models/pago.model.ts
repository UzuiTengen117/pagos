export interface Pago {
  id: number;
  alumnoId: number;
  alumnoNombre: string;
  monto: number;
  montoOriginal: number;
  concepto: string;
  fechaPago: Date;
  estado: 'pagado' | 'pendiente' | 'vencido';
  semana: number;
  mes: string;
  becaPorcentaje: number;
  precioId: number;
  tipoPago?: string;
  becaId?: number;
  becaNombre?: string;
  montoParcial?: number;
  notasPendiente?: string;
}
