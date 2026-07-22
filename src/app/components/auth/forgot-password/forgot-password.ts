import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private authService = inject(AuthService);

  username = '';
  newPassword = '';
  confirmPassword = '';
  errorMsg = '';
  successMsg = '';
  step = 1;

  onSubmitUsername(): void {
    this.errorMsg = '';

    if (!this.username.trim()) {
      this.errorMsg = 'Por favor, ingresa tu nombre de usuario.';
      return;
    }

    this.step = 2;
  }

  onSubmitPassword(): void {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMsg = 'Por favor, completa ambos campos.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    const success = this.authService.resetPassword(this.username, this.newPassword);
    if (success) {
      this.successMsg = 'Contraseña actualizada exitosamente.';
      this.step = 3;
    } else {
      this.errorMsg = 'Usuario no encontrado.';
    }
  }
}
