export type EstadoReembolso = 'pendiente' | 'aprobada' | 'rechazada';

export interface SolicitudReembolso {
  id: number;
  alumnoId: number;
  alumnoNombre: string;
  pagoId: number | null;
  comprobanteId: number | null;
  comprobanteConcepto: string;
  comprobanteMetodoPago: string;
  comprobanteFecha: Date | null;
  folio: string;
  pagoMes: string;
  monto: number;
  motivo: string;
  estado: EstadoReembolso;
  motivoRechazo: string;
  motivoAprobacion: string;
  revisadoPor: number | null;
  revisadoPorNombre: string;
  creadaPor: number | null;
  createdAt: Date;
  updatedAt: Date | null;
}
