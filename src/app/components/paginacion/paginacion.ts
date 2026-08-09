import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PAGE_SIZE } from '../../utils/paginacion';

@Component({
  selector: 'app-paginacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginacion.html',
  styleUrl: './paginacion.scss',
})
export class PaginacionComponent {
  @Input() total = 0;
  @Input() pageSize = PAGE_SIZE;
  @Input() pagina = 1;
  @Output() cambiarPagina = new EventEmitter<number>();

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get paginas(): (number | '...')[] {
    const total = this.totalPaginas;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const current = this.pagina;
    const pages: (number | '...')[] = [1];
    const start = Math.max(2, current - 2);
    const end = Math.min(total - 1, current + 2);

    if (start > 2) pages.push('...');
    for (let p = start; p <= end; p++) pages.push(p);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  }

  get mostrarPaginacion(): boolean {
    return this.total > this.pageSize;
  }

  ir(pagina: number | '...'): void {
    if (typeof pagina !== 'number') return;
    const nueva = Math.min(Math.max(1, pagina), this.totalPaginas);
    if (nueva !== this.pagina) {
      this.cambiarPagina.emit(nueva);
    }
  }
}
