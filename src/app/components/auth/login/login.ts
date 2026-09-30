import { Component, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { NotificationService } from '../../../services/notification';
import { DuplicateSessionModal } from '../../modal/duplicate-session-modal';
import { timeout, catchError, map } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// El resultado del login se modela comounion y no como "respuesta o null": antes
// el error se manejaba DOS veces (dentro de catchError y otra vez en next, al
// recibir el of(null) de retorno), y ese segundo toque de `loading` caia
// despues de que la notificacion escribiera su signal, que es exactamente lo que
// Angular reportaba como NG0100 en el binding `disabled`.
type ResultadoLogin =
  | { ok: true }
  | { ok: false; status: number };

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
      // Aca SOLO se transforma la respuesta. Ningun estado del componente se
      // toca dentro de catchError: si se tocara, el error se resolveria dos
      // veces y el binding `disabled` se moveria dentro de la misma pasada de
      // deteccion de cambios. Todo ocurre en el subscribe, una sola vez.
      map((): ResultadoLogin => ({ ok: true })),
      catchError((error) => of<ResultadoLogin>({
        ok: false,
        status: error instanceof HttpErrorResponse ? error.status : 0,
      }))
    ).subscribe((resultado) => {
      this.loading = false;

      if (resultado.ok) {
        const user = this.authService.currentUser();
        if (user?.rol === 'estudiante') {
          this.router.navigate(['/alumno/home']);
        } else {
          this.router.navigate(['/home']);
        }
        return;
      }

      if (resultado.status === 429) {
        this.startCooldown(30);
        this.notificationService.error('Demasiados intentos. Espera antes de intentar de nuevo.');
      } else {
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