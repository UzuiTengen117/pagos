import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  private notifications = signal<Notification[]>([]);

  getNotifications() {
    return this.notifications;
  }

  show(message: string, type: Notification['type'] = 'info', duration: number = 3000): void {
    const id = this.nextId++;
    const notification: Notification = { id, message, type, duration };
    this.notifications.update(n => [...n, notification]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(message: string, duration: number = 3000): void {
    this.show(message, 'success', duration);
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
