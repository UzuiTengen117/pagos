import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { Pago } from '../../../models/pago.model';

@Component({
  selector: 'app-alumno-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alumno-pagos.html',
  styleUrl: './alumno-pagos.scss',
})
export class AlumnoPagos {
  private authService = inject(AuthService);
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);

  currentUser = this.authService.currentUser;
  filtroFechaInicio = '';
  filtroFechaFin = '';

  get misPagos(): Pago[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.username === usuario.username
    );
    if (!alumno) return [];
    let pagos = this.pagosService.getAll().filter(p => p.alumnoId === alumno.id);

    if (this.filtroFechaInicio && this.filtroFechaFin) {
      const inicio = new Date(this.filtroFechaInicio);
      const fin = new Date(this.filtroFechaFin);
      pagos = pagos.filter(p => {
        const fecha = new Date(p.fechaPago);
        return fecha >= inicio && fecha <= fin;
      });
    }

    return pagos;
  }

  limpiarFiltros(): void {
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
  }
}
