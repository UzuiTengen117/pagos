import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PagosService } from '../../../services/pagos';
import { AlumnosService } from '../../../services/alumnos';
import { ComprobantesService } from '../../../services/comprobantes';
import { BecasService } from '../../../services/becas';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private pagosService = inject(PagosService);
  private alumnosService = inject(AlumnosService);
  private comprobantesService = inject(ComprobantesService);
  private becasService = inject(BecasService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  resumen = this.pagosService.getResumen();
  totalAlumnos = 0;
  becas: { nombre: string; porcentaje: number; cantidad: number }[] = [];
  totalComprobantes = 0;
  currentUser = this.authService.currentUser;

  ngOnInit(): void {
    this.pagosService.loadAll().subscribe({
      next: () => {
        this.resumen = this.pagosService.getResumen();
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });

    this.alumnosService.loadAll().subscribe({
      next: (alumnos) => {
        this.totalAlumnos = alumnos.length;
        this.cdr.detectChanges();

        this.becasService.loadAll().subscribe({
          next: (becasData) => {
            this.becas = becasData.map(b => ({
              nombre: b.nombre,
              porcentaje: b.porcentaje,
              cantidad: alumnos.filter(a => a.becaId === b.id).length,
            }));
            this.cdr.detectChanges();
          },
          error: () => {}
        });
      },
      error: () => {
        this.cdr.detectChanges();
      }
    });

    this.comprobantesService.loadAll().subscribe({
      next: (data) => {
        this.totalComprobantes = data.length;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  getGananciasSemanaEntries(): [string, number][] {
    return Object.entries(this.resumen.gananciasPorSemana) as [string, number][];
  }

  getGananciasMesEntries(): [string, number][] {
    return Object.entries(this.resumen.gananciasPorMes) as [string, number][];
  }

  getBarWidth(value: number): number {
    const vals = Object.values(this.resumen.gananciasPorSemana);
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    return max > 0 ? (value / max) * 100 : 0;
  }

  getBarWidthMes(value: number): number {
    const vals = Object.values(this.resumen.gananciasPorMes);
    const max = vals.length > 0 ? Math.max(...vals) : 0;
    return max > 0 ? (value / max) * 100 : 0;
  }
}
