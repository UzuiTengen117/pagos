import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { Pago } from '../../../models/pago.model';

@Component({
  selector: 'app-alumno-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alumno-home.html',
  styleUrl: './alumno-home.scss',
})
export class AlumnoHome {
  private authService = inject(AuthService);
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);

  currentUser = this.authService.currentUser;

  get misPagos(): Pago[] {
    const usuario = this.currentUser();
    if (!usuario) return [];
    const alumno = this.alumnosService.getAll().find(
      a => a.username === usuario.username
    );
    if (!alumno) return [];
    return this.pagosService.getAll().filter(p => p.alumnoId === alumno.id);
  }

  get totalPagado(): number {
    return this.misPagos
      .filter(p => p.estado === 'pagado')
      .reduce((sum, p) => sum + p.monto, 0);
  }

  get pendientes(): number {
    return this.misPagos.filter(p => p.estado === 'pendiente').length;
  }

  get vencidos(): number {
    return this.misPagos.filter(p => p.estado === 'vencido').length;
  }

  get pagosPorMes(): { mes: string; monto: number }[] {
    const agrupado: { [key: string]: number } = {};
    this.misPagos
      .filter(p => p.estado === 'pagado')
      .forEach(p => {
        agrupado[p.mes] = (agrupado[p.mes] || 0) + p.monto;
      });
    return Object.entries(agrupado).map(([mes, monto]) => ({ mes, monto }));
  }

  getBarWidth(value: number): number {
    const max = Math.max(...this.pagosPorMes.map(p => p.monto), 0);
    return max > 0 ? (value / max) * 100 : 0;
  }
}
