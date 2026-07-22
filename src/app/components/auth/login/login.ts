import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';

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

  onSubmit(): void {
    this.errorMsg = '';
    if (!this.username || !this.password) {
      this.errorMsg = 'Por favor, ingresa todos los campos.';
      return;
    }
    const success = this.authService.login({ username: this.username, password: this.password });
    if (success) {
      this.router.navigate(['/home']);
    } else {
      this.errorMsg = 'Usuario o contraseña incorrectos.';
    }
  }
}
