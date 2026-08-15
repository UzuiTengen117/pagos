import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  step: 1 | 2 = 1;
  username = '';
  newPassword = '';
  confirmNewPassword = '';
  errorMsg = '';
  successMsg = '';
  loading = false;

  buscarUsuario(): void {
    this.errorMsg = '';
    const usernameClean = this.username.trim();
    if (!usernameClean) {
      this.errorMsg = 'Ingresa tu nombre de usuario.';
      return;
    }

    this.loading = true;
    this.authService.verificarUsuario(usernameClean).pipe(
      timeout(5000),
      catchError((error) => {
        this.loading = false;
        this.errorMsg = error?.error?.message || 'No se pudo verificar el usuario.';
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res) {
          this.cdr.detectChanges();
          return;
        }
        this.step = 2;
        this.cdr.detectChanges();
      },
    });
  }

  restablecer(): void {
    this.errorMsg = '';
    if (this.newPassword.length < 6) {
      this.errorMsg = 'La nueva contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;
    this.authService.recuperarContrasena(this.username.trim(), this.newPassword).pipe(
      timeout(5000),
      catchError((error) => {
        this.loading = false;
        this.errorMsg = error?.error?.message || 'No se pudo restablecer la contraseña.';
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res) {
          this.cdr.detectChanges();
          return;
        }
        this.successMsg = 'Contraseña restablecida. Ya puedes iniciar sesión.';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
    });
  }
}
