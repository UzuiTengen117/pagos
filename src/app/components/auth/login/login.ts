import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { NotificationService } from '../../../services/notification';
import { DuplicateSessionModal } from '../../modal/duplicate-session-modal';
import { timeout, catchError } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DuplicateSessionModal],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notificationService = inject(NotificationService);

  username = '';
  password = '';
  errorMsg = '';
  loading = false;
  cooldown = false;
  showPassword = false;
  cooldownSeconds = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private duplicateSub: Subscription | null = null;

  ngOnInit(): void {
    this.duplicateSub = this.authService.onDuplicateLoginConfirmed().subscribe(request => {
      this.doLogin(request.username, request.password);
    });
  }

  ngOnDestroy(): void {
    this.duplicateSub?.unsubscribe();
  }

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
    if (this.cooldown) {
      return;
    }

    if (this.authService.checkDuplicateSession(usernameClean)) {
      this.authService.requestLogin({ username: usernameClean, password: this.password });
      return;
    }

    this.doLogin(usernameClean, this.password);
  }

  private doLogin(username: string, password: string): void {
    this.loading = true;
    this.errorMsg = '';

    this.authService.login({ username, password }).pipe(
      timeout(5000),
      catchError((error) => {
        this.loading = false;
        if (error instanceof HttpErrorResponse && error.status === 429) {
          this.startCooldown(30);
          this.notificationService.error('Demasiados intentos. Espera antes de intentar de nuevo.');
        } else {
          this.notificationService.error('Credenciales incorrectas');
        }
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

  private startCooldown(seconds: number): void {
    this.cooldown = true;
    this.cooldownSeconds = seconds;
    this.cooldownTimer = setInterval(() => {
      this.cooldownSeconds--;
      if (this.cooldownSeconds <= 0) {
        this.cooldown = false;
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = null;
        }
      }
    }, 1000);
  }
}