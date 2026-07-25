import { Component, inject, OnInit } from '@angular/core';
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
export class ForgotPassword implements OnInit {
  private authService = inject(AuthService);

  username = '';
  newPassword = '';
  confirmPassword = '';
  errorMsg = '';
  successMsg = '';
  step = 1;

  ngOnInit(): void {}

  onSubmitUsername(): void {
    this.errorMsg = '';

    if (!this.username.trim()) {
      this.errorMsg = 'Por favor, ingresa tu nombre de usuario.';
      return;
    }

    this.authService.getUsuarioIdByUsername(this.username).subscribe({
      next: (usuarios) => {
        const user = usuarios.find((u: any) => u.username === this.username);
        if (user) {
          this.step = 2;
        } else {
          this.errorMsg = 'Usuario no encontrado.';
        }
      },
      error: () => {
        this.errorMsg = 'Usuario no encontrado.';
      }
    });
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

    this.authService.resetPassword(this.username, this.newPassword).subscribe({
      next: () => {
        this.successMsg = 'Contraseña actualizada exitosamente.';
        this.step = 3;
      },
      error: () => {
        this.errorMsg = 'Error al actualizar la contraseña.';
      }
    });
  }
}
