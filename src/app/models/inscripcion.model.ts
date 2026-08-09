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
  grado?: string;
  estado: 'pagado' | 'pendiente' | 'vencido' | 'activa';
  metodoPago: string;
  notas: string;
}
