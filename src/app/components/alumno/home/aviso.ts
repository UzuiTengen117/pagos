import { Component, inject, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Aviso, avisosDisponibles } from '../../../models/aviso.model';

// Aviso al entrar a /alumno/home. Anuncia lo que sea que toque: un torneo o un
// examen. El padre mapea cada lista a `Aviso` (ver aviso.model.ts) y aqui solo
// se aplica la regla de "que amerita un aviso", que es la misma para ambos.
//
// La clase se llama `AvisoModal` y no `Aviso` porque ese nombre ya lo usa la
// interfaz del modelo que recibe por input, y dos cosas distintas con el mismo
// nombre en el mismo archivo obligan a castear en un lado o en otro.
//
// No guarda "ya lo vi" en ningun lado a proposito: el requerimiento es que salte
// CADA vez que el alumno entra mientras haya algo que avisar. Un localStorage
// aqui seria una segunda fuente de verdad que ademas se desincroniza: si el
// entrenador cancela el torneo, el alumno que ya lo habia visto no volveria a
// ver el aviso.
@Component({
  selector: 'app-aviso',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aviso.html',
  styleUrl: './aviso.scss',
})
export class AvisoModal {
  private router = inject(Router);

  // input() y no @Input: es un signal, asi que el computed de abajo se vuelve a
  // evaluar solo cuando el padre recarga la lista. Con un @Input clasico el
  // filtro se congelaria con el primer valor recibido.
  avisos = input<Aviso[]>([]);

  // La visibilidad la decide el padre, no el modal. Va como input y no como un
  // `signal(true)` interno porque el padre es el que encadena los dos avisos
  // (primero los torneos, despues los examenes) y no puede hacerlo si el
  // modal se apaga solo: un signal interno dejaria al segundo modal tapado desde
  // el arranque, y el primero nunca le diria al padre que ya termino.
  visible = input(true);

  // Avisa al padre cada vez que el alumno cierra, con la X o con "Ahora no". El
  // padre lo usa para apartar la pantalla del primer aviso y, a partir de ahi,
  // destapar la del segundo.
  cerrado = output<void>();

  // Solo ameritan aviso los que: estan programados, siguen en el futuro y el
  // alumno no se ha inscrito. Uno cancelado o uno en el que ya esta inscrito no
  // son un aviso, son ruido. La regla vive en `avisosDisponibles` porque el
  // padre la necesita tambien para ordenar los dos modales.
  disponibles = computed(() => avisosDisponibles(this.avisos()));

  principal = computed(() => this.disponibles()[0] ?? null);
  otros = computed(() => Math.max(0, this.disponibles().length - 1));

  // Si el <img> falla al cargar (URL vieja, archivo borrado del bucket) se cae
  // al modal sin banner. Un icono de imagen rota en el aviso se lee como error
  // del sistema, no como "esto no tiene foto".
  imagenRota = signal(false);
  mostrarImagen = computed(() => {
    const a = this.principal();
    return Boolean(a?.imagen) && !this.imagenRota();
  });

  // El modal ya no se apaga solo: se lo pide al padre. Este es el unico punto
  // por el que el padre se entera de que el alumno ya vio este aviso, asi que
  // las dos salidas de la pantalla (la X y "Ahora no") tienen que pasar por aqui.
  cerrar(): void {
    this.cerrado.emit();
  }

  lugaresLibres(a: Aviso): number | null {
    return a.cupoMaximo != null ? Math.max(0, a.cupoMaximo - a.inscritos) : null;
  }

  estaLleno(a: Aviso): boolean {
    return a.cupoMaximo != null && a.inscritos >= a.cupoMaximo;
  }

  irAInscripcion(): void {
    const aviso = this.principal();
    if (!aviso) return;
    this.cerrar();
    // Se pasa el id por query param para que la pantalla abra la tarjeta del
    // examen o torneo anunciado, en vez de dejar que el alumno lo busque entre
    // todos.
    this.router.navigate([aviso.ruta], { queryParams: { destacado: aviso.id } });
  }
}
