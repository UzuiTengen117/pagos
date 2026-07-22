export interface Pago {
  id: number;
  alumnoId: number;
  alumnoNombre: string;
  monto: number;
  concepto: string;
  fechaPago: Date;
  estado: 'pagado' | 'pendiente' | 'vencido';
  semana: number;
  mes: string;
}
