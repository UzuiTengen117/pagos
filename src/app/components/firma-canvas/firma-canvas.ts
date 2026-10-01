import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  afterNextRender,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Captura de una firma sobre un <canvas>.
//
// Se usa Pointer Events y no `mouse*` + `touch*` por una razon concreta: el
// `touchstart` de un movil llega ADEMAS del `mousedown` sintetico que genera el
// navegador ~300 ms despues, y con dos handlers separados el trazo se dibuja dos
// veces y el dedo deja el dedo pegado a la pantalla. Pointer Events disparan una
// vez y cubren raton, lapiz, dedo y barra invertida con el mismo codigo.
//
// La firma se guarda como data URL y no como un File: el backend la espera como
// texto en la fila, no como upload. Es lo que hace que un solo request guarde la
// inscripcion entera.
@Component({
  selector: 'app-firma-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './firma-canvas.html',
  styleUrl: './firma-canvas.scss',
})
export class FirmaCanvasComponent implements OnDestroy {
  // Lo que ya habia firmado (por ejemplo al corregir una inscripcion). Se pinta
  // una vez al abrir; despues manda lo que el usuario dibuje.
  @Input() valor = '';
  @Input() etiqueta = 'Firma';
  @Input() requerido = false;
  // Alto en pixeles CSS. El ancho se toma del contenedor.
  @Input() alto = 150;

  @Output() valorChange = new EventEmitter<string>();

  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  // En vez de un `get tieneFirma()` que solo mira el input: el canvas se puede
  // borrar y redibujar, y el input no cambia en ninguno de los dos casos.
  readonly hayFirma = signal(false);

  private ctx: CanvasRenderingContext2D | null = null;
  private dibujando = false;
  private ultimoX = 0;
  private ultimoY = 0;
  private resizeObserver?: ResizeObserver;
  private destruido = false;

  constructor() {
    // `afterNextRender` y no `ngAfterViewInit`: el canvas necesita medir su
    // contenedor, y antes del primer render no tiene tamaño que medir. Ademas no
    // dispara en el servidor, donde no hay nada que dibujar.
    afterNextRender(() => this.preparar());
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.resizeObserver?.disconnect();
  }

  // ── Dibujo ────────────────────────────────────────────────────────────────

  iniciar(event: PointerEvent): void {
    // Solo el botón principal: con el derecho se abriría el menú contextual en
    // vez de firmar.
    if (event.button !== 0 && event.pointerType === 'mouse') {
      return;
    }
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }

    event.preventDefault();
    this.dibujando = true;
    this.hayFirma.set(true);

    // Sin esto, al soltar el puntero fuera del canvas el `pointerup` se pierde y
    // `dibujando` se queda en true: el siguiente trazo continuaría la línea
    // anterior desde un punto lejano.
    canvas.setPointerCapture(event.pointerId);

    const rect = canvas.getBoundingClientRect();
    this.ultimoX = event.clientX - rect.left;
    this.ultimoY = event.clientY - rect.top;
  }

  dibujar(event: PointerEvent): void {
    if (!this.dibujando || !this.ctx) {
      return;
    }
    event.preventDefault();

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Una `lineTo` suelta deja un punto si el puntero salta; por eso se pinta el
    // primer pixel con un `moveTo`+`lineTo` identicos en lugar de `lineTo` a secas.
    this.ctx.beginPath();
    this.ctx.moveTo(this.ultimoX, this.ultimoY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.ultimoX = x;
    this.ultimoY = y;
  }

  terminar(event: PointerEvent): void {
    if (!this.dibujando) {
      return;
    }
    this.dibujando = false;

    const canvas = this.canvasRef?.nativeElement;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    // Se emite en `terminar` y no en cada `dibujar`: `toDataURL` serializa el
    // canvas entero y hacerlo por pixel convertiría el trazo en un GIF.
    this.emitir(this.leer());
  }

  limpiar(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) {
      return;
    }
    // Se rellena con el fondo y NO con `clearRect`: si el canvas queda
    // transparente, el PNG sale con alfa y al imprimirlo sobre papel blanco las
    // zonas sin firmar se ven grises en algunos navegadores.
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.hayFirma.set(false);
    this.valor = '';
    this.valorChange.emit('');
  }

  // ── Interno ───────────────────────────────────────────────────────────────

  private emitir(dataUrl: string): void {
    // El componente no puede seguir emitiendo despues de destruirse: el modal
    // cierra al enviar y un `emitir` colgando reventaria con un ViewDestroyed.
    if (this.destruido) {
      return;
    }
    this.valor = dataUrl;
    this.valorChange.emit(dataUrl);
  }

  // Ancho maximo del PNG exportado, en pixeles.
  //
  // El canvas se dibuja al tamano del formulario (que en un celular puede ser 380
  // CSS px a dpr 3, o sea un buffer de 1140 px) y `toDataURL` de eso pesa lo
  // que pese. Como la firma viaja DENTRO del JSON de la inscripcion y
  // `express.json` esta configurado con `limit: '1mb'`, dos firmas sin acotar
  // pueden empujar el body por encima del limite y la respuesta seria un 413 de
  // Vercel, sin mensaje y sin decir que el problema eran las firmas.
  //
  // 600 px es de sobra: la firma ocupa unos 5 cm en una hoja de 21 cm de ancho,
  // asi que a 600 px sigue habiendo mas de un pixel por cada 0.3 mm impreso.
  private static readonly MAX_ANCHO = 600;

  private leer(): string {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return '';
    }

    const ancho = Math.min(canvas.clientWidth, FirmaCanvasComponent.MAX_ANCHO);
    if (ancho >= canvas.clientWidth) {
      return canvas.toDataURL('image/png');
    }

    // Se reescala a un canvas auxiliar en vez de confiar en que el PNG del buffer
    // grande salga chico: comprimir depende de como se haya dibujado, y una
    // firma hecha con lapiz digital puede generar mucho ruido en los bordes del
    // trazo.
    const alto = Math.round((canvas.height / canvas.clientWidth) * ancho);
    const auxiliar = document.createElement('canvas');
    auxiliar.width = Math.max(1, Math.round(ancho));
    auxiliar.height = Math.max(1, alto);

    const ctx = auxiliar.getContext('2d');
    if (!ctx) {
      return canvas.toDataURL('image/png');
    }

    // Fondo blanco antes de dibujar: sin esto el reescalado interpola el alfa y
    // las zonas sin firmar quedan con borde gris, visible al imprimir.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, auxiliar.width, auxiliar.height);
    ctx.drawImage(canvas, 0, 0, auxiliar.width, auxiliar.height);

    return auxiliar.toDataURL('image/png');
  }

  private preparar(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    this.ctx = ctx;

    this.ajustarTamano();

    // Un modal cambia de ancho con el viewport y el canvas no se entera solo. Sin
    // esto, en una pantalla angosta la firma se dibuja fuera del area visible.
    this.resizeObserver = new ResizeObserver(() => this.ajustarTamano());
    this.resizeObserver.observe(canvas);

    if (this.valor) {
      this.pintar(this.valor);
      this.hayFirma.set(true);
    }
  }

  private ajustarTamano(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) {
      return;
    }

    const ancho = canvas.clientWidth;
    if (ancho === 0) {
      // El contenedor todavia no tiene layout. Se sale sin hacer nada: el
      // ResizeObserver va a volver a llamar en cuanto si lo tenga.
      return;
    }

    // Se guarda lo firmado antes de redimensionar: `width = ...` borra el bitmap
    // completo del canvas, no solo lo ajusta.
    const previo = this.hayFirma() ? this.leer() : '';

    // El buffer se escala por `devicePixelRatio` para que en una pantalla de
    // 2x-3x (todo telefono) la firma no salga pixelada al imprimir. El contexto se
    // reescala con `setTransform` y asi se sigue dibujando en pixeles CSS.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(this.alto * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.lineWidth = 2.2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    // Trazo NEGRO y no el color actual: la hoja se imprime en blanco y negro y
    // un trazo azul desaparece en una impresora monocroma o en un escaneo.
    this.ctx.strokeStyle = '#111111';

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, ancho, this.alto);

    if (previo) {
      this.pintar(previo);
    }
  }

  // Reconstruye una firma ya guardada. Usa una <img> temporal en vez de ImageData
  // porque el PNG viene escalado al dpr del momento de la captura y hay que
  // escalarlo de vuelta a pixeles CSS.
  private pintar(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas || !this.ctx || this.destruido) {
        return;
      }
      this.ctx.drawImage(img, 0, 0, canvas.clientWidth, this.alto);
    };
    img.onerror = () => {
      // Una data URL corrupta no puede romper la pantalla. La firma simplemente
      // no aparece y el usuario puede volver a dibujarla encima.
    };
    img.src = dataUrl;
  }
}
