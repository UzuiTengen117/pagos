import { CuentaRegresiva } from '../models/evento.model';

// La cuenta regresiva se recalcula cada segundo contra la hora del navegador, no
// contra un contador que se decrementa: asi sigue siendo correcta si la pestaña
// estuvo en segundo plano (el navegador frena los temporizadores) o si el
// dispositivo cambio de reloj.
export function calcularCuentaRegresiva(fechaIso: string, ahora = Date.now()): CuentaRegresiva {
  const objetivo = new Date(fechaIso).getTime();
  const vacia: CuentaRegresiva = { dias: 0, horas: 0, minutos: 0, segundos: 0, totalMs: 0, terminado: true };

  if (Number.isNaN(objetivo)) {
    return vacia;
  }

  const restante = objetivo - ahora;
  if (restante <= 0) {
    return vacia;
  }

  const segundosTotales = Math.floor(restante / 1000);

  return {
    dias: Math.floor(segundosTotales / 86400),
    horas: Math.floor((segundosTotales % 86400) / 3600),
    minutos: Math.floor((segundosTotales % 3600) / 60),
    segundos: segundosTotales % 60,
    totalMs: restante,
    terminado: false,
  };
}

export function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

// Un evento con estado "programado" cuya fecha ya paso se muestra como
// finalizado: dejarlo en "programado" con el reloj en cero se ve como un bug.
export function eventoTerminado(fechaIso: string, ahora = Date.now()): boolean {
  const objetivo = new Date(fechaIso).getTime();
  if (Number.isNaN(objetivo)) {
    return true;
  }
  return objetivo <= ahora;
}

// El pipe date usa en-US porque la app no registra locale, y con EEEE el día
// salía como "Wednesday" en una interfaz en español. Se formatea con Intl
// apuntando a es-MX, que ademas da el orden d/m/a que ya usa el resto.
export function formatearFechaLarga(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) {
    return 'Fecha por definir';
  }

  const dia = fecha.toLocaleDateString('es-MX', { weekday: 'long' });
  const numerico = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${numerico}`;
}
