export interface Comprobante {
  id: number;
  folio: string;
  pagoId: number;
  alumnoId: number;
  alumnoNombre: string;
  alumnoEmail: string;
  concepto: string;
  monto: number;
  fechaEmision: Date;
  estado: 'activo' | 'cancelado';
  metodoPago: 'efectivo' | 'transferencia' | 'tarjeta';
  observaciones: string;
}
