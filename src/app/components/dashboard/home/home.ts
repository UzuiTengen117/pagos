import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private authService = inject(AuthService);

  resumen = this.pagosService.getResumen();
  totalAlumnos = this.alumnosService.getAll().length;
  becados50 = this.alumnosService.getBecados50().length;
  becados100 = this.alumnosService.getBecados100().length;
  currentUser = this.authService.currentUser;

  getGananciasSemanaEntries(): [string, number][] {
    return Object.entries(this.resumen.gananciasPorSemana) as [string, number][];
  }

  getGananciasMesEntries(): [string, number][] {
    return Object.entries(this.resumen.gananciasPorMes) as [string, number][];
  }

  getBarWidth(value: number): number {
    const max = Math.max(...Object.values(this.resumen.gananciasPorSemana));
    return max > 0 ? (value / max) * 100 : 0;
  }

  getBarWidthMes(value: number): number {
    const max = Math.max(...Object.values(this.resumen.gananciasPorMes));
    return max > 0 ? (value / max) * 100 : 0;
  }
}
