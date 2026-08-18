import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { NotificationService } from '../../../services/notification';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  username = '';
  password = '';
  errorMsg = '';
  loading = false;

  onSubmit(): void {
    this.errorMsg = '';
    const usernameClean = this.username.trim();
    if (!usernameClean || !this.password) {
      this.errorMsg = 'Por favor, ingresa todos los campos.';
      return;
    }
    if (usernameClean.length > 255) {
      this.errorMsg = 'El nombre de usuario no puede superar los 255 caracteres.';
      return;
    }

    this.loading = true;

    this.authService.login({ username: usernameClean, password: this.password }).pipe(
      timeout(5000),
      catchError((error) => {
        this.loading = false;
        this.notificationService.error('Credenciales incorrectas');
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        this.loading = false;
        if (!response) return;
        const user = this.authService.currentUser();
        if (user?.rol === 'estudiante') {
          this.router.navigate(['/alumno/home']);
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Credenciales incorrectas');
      }
    });
  }
}
