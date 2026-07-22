import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth';
import { ComprobantesService } from '../../../services/comprobantes';
import { AlumnosService } from '../../../services/alumnos';
import { Comprobante } from '../../../models/comprobante.model';

@Component({
  selector: 'app-alumno-comprobantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-comprobantes.html',
  styleUrl: './alumno-comprobantes.scss',
})
export class AlumnoComprobantes {
  private authService = inject(AuthService);
  private comprobantesService = inject(ComprobantesService);
  private alumnosService = inject(AlumnosService);

  currentUser = this.authService.currentUser;
  showPreviewModal = false;
  comprobantePreview: Comprobante | null = null;
  filtroFechaInicio = '';
  filtroFechaFin = '';

  get misComprobantes(): Comprobante[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.username === usuario.username
    );
    if (!alumno) return [];
    let comprobantes = this.comprobantesService.getAll().filter(
      c => c.alumnoId === alumno.id
    );

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      comprobantes = comprobantes.filter(c => {
        const fecha = new Date(c.fechaEmision);
        return fecha >= inicio && fecha <= fin;
      });
    }

    return comprobantes;
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
  }

  openPreview(comprobante: Comprobante): void {
    this.comprobantePreview = comprobante;
    this.showPreviewModal = true;
  }

  closePreview(): void {
    this.showPreviewModal = false;
    this.comprobantePreview = null;
  }

  printComprobante(): void {
    const printContent = document.getElementById('comprobante-print');
    if (!printContent) return;

    const windowprint = window.open('', '_blank', 'width=800,height=600');
    if (!windowprint) return;

    windowprint.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Comprobante de Pago</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', Arial, sans-serif; padding: 2rem; color: #1e293b; }
          .comprobante { max-width: 700px; margin: 0 auto; border: 2px solid #1e1b4b; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e1b4b, #4f46e5); color: white; padding: 1.5rem; text-align: center; }
          .header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
          .header p { opacity: 0.8; font-size: 0.85rem; }
          .folio-bar { background: #f1f5f9; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; font-size: 0.85rem; }
          .folio-bar strong { color: #4f46e5; }
          .body { padding: 1.5rem; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
          .info-item label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 0.25rem; }
          .info-item span { font-size: 0.95rem; font-weight: 500; }
          .monto-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 1.25rem; text-align: center; margin-bottom: 1.5rem; }
          .monto-box .label { font-size: 0.8rem; color: #166534; font-weight: 600; text-transform: uppercase; }
          .monto-box .amount { font-size: 2rem; font-weight: 800; color: #166534; }
          .observaciones { background: #f8fafc; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
          .observaciones label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 0.25rem; }
          .footer { border-top: 2px solid #e2e8f0; padding: 1rem 1.5rem; text-align: center; font-size: 0.8rem; color: #64748b; }
          .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600; font-size: 0.8rem; }
          .status.activo { background: #dcfce7; color: #166534; }
          .status.cancelado { background: #fee2e2; color: #991b1b; }
          @media print { body { padding: 0; } .comprobante { border: 2px solid #000; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    windowprint.document.close();
    windowprint.print();
  }
}
