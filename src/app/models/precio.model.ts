export interface Precio {
  id: number;
  concepto: string;
  monto: number;
  tipo: 'mensualidad' | 'semanal' | 'otro';
}
