import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (notification of notifications(); track notification.id) {
        <div
          class="toast"
          [class]="'toast-' + notification.type"
          (click)="dismiss(notification.id)"
        >
          <span class="toast-icon">
            @switch (notification.type) {
              @case ('success') { &#10003; }
              @case ('error') { &#10007; }
              @case ('warning') { &#9888; }
              @case ('info') { &#8505; }
            }
          </span>
          <span class="toast-message">{{ notification.message }}</span>
          @if (notification.accion; as accion) {
            <!-- El click NO se detiene a proposito: primero corre la accion y
                 despues el evento sube al contenedor, que cierra el aviso. Asi un
                 boton que se puede pulsar y que ademas se va solo, sin tener que
                 acordarse de cerrarlo. -->
            <button type="button" class="toast-accion" (click)="accion.ejecutar()">
              {{ accion.etiqueta }}
            </button>
          }
          <span class="toast-close">&times;</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .toast-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
    }

    .toast-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .toast-warning {
      background: #fffbeb;
      border: 1px solid #fed7aa;
      color: #92400e;
    }

    .toast-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }

    .toast-icon {
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    .toast-message {
      flex: 1;
    }

    // El aviso entero es pulsable porque lo cierra, asi que el boton de la accion
    // necesita separarse de esa superficie o no se ve como un control. Al
    // pulsarlo se invierte: fondo del color del texto y texto blanco, sin
    // hardcodear un verde que solo le queda bien al aviso de exito.
    .toast-accion {
      flex-shrink: 0;
      padding: 5px 11px;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }

    .toast-accion:hover {
      background: currentColor;
      color: #ffffff;
    }

    .toast-accion:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }

    .toast-close {
      opacity: 0.5;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .toast-close:hover {
      opacity: 1;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent {
  private notificationService = inject(NotificationService);
  notifications = this.notificationService.getNotifications();

  dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }
}
