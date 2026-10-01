import { Injectable, signal } from '@angular/core';

// Un aviso con accion es el que se usa cuando una descarga SALTA sola y el
// navegador puede bloquearla: la activacion del usuario caduca a los pocos
// segundos y un par de round-trips la gastan, asi que el `click()` programatico
// se pierde sin un solo error visible. Con la accion a la vista hay un segundo
// camino, y esta vez con un gesto real del usuario.
export interface AccionNotificacion {
  etiqueta: string;
  ejecutar: () => void;
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  accion?: AccionNotificacion;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  private notifications = signal<Notification[]>([]);

  getNotifications() {
    return this.notifications;
  }

  show(
    message: string,
    type: Notification['type'] = 'info',
    duration: number = 3000,
    accion?: AccionNotificacion
  ): void {
    const id = this.nextId++;
    const notification: Notification = { id, message, type, duration, accion };
    this.notifications.update(n => [...n, notification]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
  }

  // Un aviso con accion se queda mas tiempo: los 3s del default son lo justo
  // para leerlo y se van antes de que el dedo llegue al boton.
  successConAccion(message: string, etiqueta: string, ejecutar: () => void): void {
    this.show(message, 'success', 12_000, { etiqueta, ejecutar });
  }

  error(message: string, duration: number = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 3000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = 4000): void {
    this.show(message, 'warning', duration);
  }

  dismiss(id: number): void {
    this.notifications.update(n => n.filter(notif => notif.id !== id));
  }

  dismissAll(): void {
    this.notifications.set([]);
  }
}
