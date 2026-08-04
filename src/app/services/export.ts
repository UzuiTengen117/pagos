import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Pago } from '../models/pago.model';
import { Inscripcion } from '../models/inscripcion.model';
import { Comprobante } from '../models/comprobante.model';

@Injectable({ providedIn: 'root' })
export class ExportService {

  exportPagos(pagos: Pago[]): void {
    const datos = pagos.map(p => ({
      'ID': p.id,
      'Alumno': p.alumnoNombre,
      'Beca': p.becaPorcentaje > 0 ? `${p.becaPorcentaje}%` : '-',
      'Concepto': p.concepto,
      'Precio Original': p.montoOriginal,
      'Monto Final': p.montoParcial && p.montoParcial > 0 && p.montoParcial < p.monto ? p.montoParcial : p.monto,
      'Fecha': new Date(p.fechaPago).toLocaleDateString('es-MX'),
      'Semana': p.semana,
      'Mes': p.mes,
      'Estado': p.estado.charAt(0).toUpperCase() + p.estado.slice(1),
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 8 },
      { wch: 30 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 12 },
    ];

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `pagos_resumen_${fecha}.xlsx`);
  }

  exportInscripciones(inscripciones: Inscripcion[]): void {
    const datos = inscripciones.map(i => ({
      'ID': i.id,
      'Alumno': i.alumnoNombre,
      'Monto Original': i.montoOriginal,
      'Descuento': i.becaPorcentaje > 0 ? `${i.becaPorcentaje}%` : '-',
      'Monto Final': i.monto,
      'Fecha': new Date(i.fechaInscripcion).toLocaleDateString('es-MX'),
      'Estado': i.estado.charAt(0).toUpperCase() + i.estado.slice(1),
      'Metodo de Pago': i.metodoPago.charAt(0).toUpperCase() + i.metodoPago.slice(1),
      'Notas': i.notas || '-',
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datos);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscripciones');

    ws['!cols'] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 16 },
      { wch: 10 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
    ];

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `inscripciones_resumen_${fecha}.xlsx`);
  }

  exportGanancias(
    pagos: Pago[],
    comprobantes: Comprobante[],
    fechaInicio: string,
    fechaFin: string
  ): void {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T23:59:59');

    const pagosFiltrados = pagos.filter((p: Pago) => {
      if (p.estado !== 'pagado') return false;
      if (p.concepto && p.concepto.toLowerCase().includes('inscripcion')) return false;
      const fecha = new Date(p.fechaPago);
      return fecha >= inicio && fecha <= fin;
    });

    const inscripciones = comprobantes.filter(c => {
      if (!c.concepto || !c.concepto.toLowerCase().includes('inscripcion')) return false;
      const fecha = new Date(c.fechaEmision);
      return fecha >= inicio && fecha <= fin;
    });

    const aoa: any[][] = [];

    aoa.push(['GANANCIAS DE PAGOS']);
    aoa.push(['ID', 'Alumno', 'Beca', 'Concepto', 'Precio Original', 'Monto Final', 'Fecha', 'Semana', 'Mes']);
    pagosFiltrados.forEach(p => {
      aoa.push([
        p.id,
        p.alumnoNombre,
        p.becaPorcentaje > 0 ? `${p.becaPorcentaje}%` : '-',
        p.concepto,
        p.montoOriginal,
        p.montoParcial && p.montoParcial > 0 && p.montoParcial < p.monto ? p.montoParcial : p.monto,
        new Date(p.fechaPago).toLocaleDateString('es-MX'),
        p.semana,
        p.mes,
      ]);
    });
    const totalPagos = pagosFiltrados.reduce((sum, p) => sum + (p.montoParcial && p.montoParcial > 0 && p.montoParcial < p.monto ? p.montoParcial : p.monto), 0);
    aoa.push(['TOTAL GANANCIAS DE PAGOS', '', '', '', '', totalPagos]);
    aoa.push([]);

    aoa.push(['GANANCIAS DE INSCRIPCIONES']);
    if (inscripciones.length > 0) {
      aoa.push(['Folio', 'Alumno', 'Concepto', 'Monto', 'Fecha', 'Metodo de Pago']);
      inscripciones.forEach(c => {
        aoa.push([
          c.folio,
          c.alumnoNombre,
          c.concepto,
          c.monto,
          new Date(c.fechaEmision).toLocaleDateString('es-MX'),
          (c.metodoPago || 'efectivo').charAt(0).toUpperCase() + (c.metodoPago || 'efectivo').slice(1),
        ]);
      });
      const totalInscripciones = inscripciones.reduce((sum, c) => sum + c.monto, 0);
      aoa.push(['TOTAL GANANCIAS DE INSCRIPCIONES', '', '', totalInscripciones]);
      aoa.push([]);
    }

    const totalGeneral = aoa
      .filter(fila => String(fila[0]).startsWith('TOTAL'))
      .reduce((sum, fila) => {
        for (let i = fila.length - 1; i >= 0; i--) {
          const v = fila[i];
          if (v !== '' && v !== undefined && v !== null && !isNaN(Number(v))) {
            return sum + Number(v);
          }
        }
        return sum;
      }, 0);
    aoa.push(['TOTAL GENERAL', '', '', '', '', totalGeneral]);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(aoa);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ganancias');

    ws['!cols'] = [
      { wch: 24 },
      { wch: 30 },
      { wch: 10 },
      { wch: 24 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
    ];

    XLSX.writeFile(wb, `ganancias_${fechaInicio}_${fechaFin}.xlsx`);
  }
}
