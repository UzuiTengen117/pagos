import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  nombre = '';
  primerApellido = '';
  segundoApellido = '';
  username = '';
  password = '';
  confirmPassword = '';
  errorMsg = '';
  successMsg = '';

  onSubmit(): void {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.nombre || !this.primerApellido || !this.segundoApellido || !this.username || !this.password || !this.confirmPassword) {
      this.errorMsg = 'Por favor, completa todos los campos.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMsg = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    const success = this.authService.register({
      nombre: this.nombre,
      primerApellido: this.primerApellido,
      segundoApellido: this.segundoApellido,
      username: this.username,
      password: this.password,
      confirmPassword: this.confirmPassword,
    });

    if (success) {
      this.successMsg = 'Registro exitoso. Redirigiendo al login...';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } else {
      this.errorMsg = 'El nombre de usuario ya existe.';
    }
  }
}
