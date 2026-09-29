import { Component, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Evento } from '../../../models/evento.model';
import { TIPOS_EVENTO } from '../../../services/eventos';

// Aviso de evento al entrar. Se abre en /alumno/home.
//
// No guarda "ya lo vi" en ningun lado a proposito: el requerimiento es que
// salte CADA vez que el alumno entra mientras haya algo que avisar. Un
// localStorage aqui seria una segunda fuente de verdad que ademas se desincroniza
// del evento: si el entrenador cancela el torneo, el alumno que ya lo habia
// visto no volveria a ver el aviso.
//
// El padre pasa la lista cruda por `eventos`; el filtro vive aqui para que la
// regla de "que amerita un aviso" este en un solo lugar.
@Component({
  selector: 'app-evento-aviso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evento-aviso.html',
  styleUrl: './evento-aviso.scss',
})
export class EventoAviso {
  private router = inject(Router);

  // input() y no @Input: es un signal, asi que el computed de abajo se vuelve a
  // evaluar solo cuando el padre recarga la lista. Con un @Input clasico el
  // filtro se congelaria con el primer valor recibido.
  eventos = input<Evento[]>([]);

  visible = signal(true);

  // Solo ameritan aviso los que: estan programados, siguen en el futuro y el
  // alumno no se ha inscrito. Un torneo cancelado o uno en el que ya esta
  // inscrito no son un aviso, son ruido.
  //
  // El filtro por cupo lleno NO va aqui a proposito: si esta lleno, el alumno
  // todavia debe saber que existe para el siguiente.
  disponibles = computed(() =>
    this.eventos()
      .filter(e => e.estado === 'programado')
      .filter(e => e.miInscripcion === null)
      .filter(e => {
        const t = new Date(e.fechaInicio).getTime();
        return !isNaN(t) && t > Date.now();
      })
      .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
  );

  eventoPrincipal = computed(() => this.disponibles()[0] ?? null);
  otros = computed(() => Math.max(0, this.disponibles().length - 1));

  // Si el <img> falla al cargar (URL vieja, archivo borrado del bucket) se cae
  // al modal sin banner. Un icono de imagen rota en el aviso se lee como error
  // del sistema, no como "este torneo no tiene foto".
  imagenRota = signal(false);
  mostrarImagen = computed(() => {
    const e = this.eventoPrincipal();
    return Boolean(e?.imagen) && !this.imagenRota();
  });

  // Se reusa el mismo catalogo de etiquetas que la pantalla de Mis Eventos, para
  // que "dual meet" no aparezca como "Dual Meet" en una pantalla y crudo en la
  // otra.
  tipoEtiqueta(t: Evento['tipo']): string {
    return TIPOS_EVENTO.find(x => x.valor === t)?.etiqueta || t;
  }

  cerrar(): void {
    this.visible.set(false);
  }

  lugaresLibres(e: Evento): number | null {
    return e.cupoMaximo != null ? Math.max(0, e.cupoMaximo - e.inscritos) : null;
  }

  estaLleno(e: Evento): boolean {
    return e.cupoMaximo != null && e.inscritos >= e.cupoMaximo;
  }

  irAInscripcion(): void {
    const evento = this.eventoPrincipal();
    this.cerrar();
    // Se pasa el id por query param para que la pantalla de eventos abra la
    // tarjeta del torneo anunciado, en vez de dejar que el alumno lo busque
    // entre todos.
    this.router.navigate(['/alumno/eventos'], { queryParams: { destacado: evento?.id } });
  }

  irAMisEventos(): void {
    this.cerrar();
    this.router.navigate(['/alumno/eventos']);
  }
}
