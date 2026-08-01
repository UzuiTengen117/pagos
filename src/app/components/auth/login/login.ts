import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
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

  username = '';
  password = '';
  errorMsg = '';
  loading = false;

  onSubmit(): void {
    this.errorMsg = '';
    if (!this.username || !this.password) {
      this.errorMsg = 'Por favor, ingresa todos los campos.';
      return;
    }

    this.loading = true;

    this.authService.login({ username: this.username, password: this.password }).pipe(
      timeout(5000),
      catchError((error) => {
        this.loading = false;
        this.errorMsg = error?.error?.message || 'Usuario o contraseña incorrectos';
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
        this.errorMsg = 'Usuario o contraseña incorrectos';
      }
    });
  }
}
