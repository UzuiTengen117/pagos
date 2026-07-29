export interface Inscripcion {
  id: number;
  alumnoId: number;
  alumnoNombre: string;
  monto: number;
  montoOriginal: number;
  becaPorcentaje: number;
  precioId: number;
  fechaInscripcion: Date;
  cicloEscolar: string;
  estado: 'pagado' | 'pendiente' | 'vencido';
  metodoPago: string;
  notas: string;
}
