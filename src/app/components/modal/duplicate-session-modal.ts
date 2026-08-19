import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-duplicate-session-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (authService.showDuplicateSessionModal()) {
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <h2>Sesión Activa Detectada</h2>
          </div>
          <div class="modal-body">
            <p>Ya existe una sesión activa del usuario <strong>{{ authService.duplicateSessionInfo()?.username }}</strong> en otra pestaña.</p>
            <p>¿Deseas usar esta sesión aquí? La sesión anterior se cerrará automáticamente.</p>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="onCancel()">Cancelar</button>
            <button class="btn btn-primary" (click)="onConfirm()">Usar esta sesión</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 16px;
    }

    .modal-header svg {
      color: #f59e0b;
      margin-bottom: 12px;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      color: #111827;
    }

    .modal-body {
      text-align: center;
      margin-bottom: 24px;
      color: #4b5563;
      line-height: 1.5;
    }

    .modal-body p {
      margin: 0 0 8px 0;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background-color: #2563eb;
    }

    .btn-secondary {
      background-color: #e5e7eb;
      color: #374151;
    }

    .btn-secondary:hover {
      background-color: #d1d5db;
    }
  `]
})
export class DuplicateSessionModal {
  authService = inject(AuthService);

  onConfirm(): void {
    this.authService.confirmDuplicateLogin().subscribe();
  }

  onCancel(): void {
    this.authService.cancelDuplicateLogin();
  }
}