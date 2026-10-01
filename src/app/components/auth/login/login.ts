import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { DuplicateSessionModal } from '../../modal/duplicate-session-modal';
import { timeout, catchError, map } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// El resultado del login se modela como union y no como "respuesta o null": antes
// el error se manejaba DOS veces (dentro de catchError y otra vez en next, al
// recibir el of(null) de retorno), y ese segundo toque del estado movia el
// binding `disabled` dentro de la misma pasada de deteccion de cambios.
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

  username = '';
  password = '';

  // Signals y no campos planos: el estado se escribe desde la respuesta HTTP y
  // desde timers, es decir FUERA de cualquier pasada de deteccion de cambios. Con
  // un campo plano Angular se enteraba del cambio a destiempo y, al re-renderizar
  // por el signal de la notificacion, comparaba el binding `disabled` contra un
  // valor viejo -> NG0100 (ExpressionChangedAfterItHasBeenCheckedError). Con
  // signals cada escritura marca la vista como sucia y se evalua una sola vez.
  errorMsg = signal('');
  loading = signal(false);
  cooldown = signal(false);
  showPassword = signal(false);
  cooldownSeconds = signal(0);

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private duplicateSub: Subscription | null = null;

  ngOnInit(): void {
    this.duplicateSub = this.authService.onDuplicateLoginConfirmed().subscribe(request => {
      this.doLogin(request.username, request.password);
    });
  }

  ngOnDestroy(): void {
    this.duplicateSub?.unsubscribe();
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    this.errorMsg.set('');
    const usernameClean = this.username.trim();
    if (!usernameClean || !this.password) {
      this.errorMsg.set('Por favor, ingresa todos los campos.');
      return;
    }
    if (usernameClean.length > 255) {
      this.errorMsg.set('El nombre de usuario no puede superar los 255 caracteres.');
      return;
    }
    if (this.cooldown()) {
      return;
    }

    if (this.authService.checkDuplicateSession(usernameClean)) {
      this.authService.requestLogin({ username: usernameClean, password: this.password });
      return;
    }

    this.doLogin(usernameClean, this.password);
  }

  private doLogin(username: string, password: string): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.authService.login({ username, password }).pipe(
      timeout(5000),
      // Aca SOLO se transforma la respuesta. Ningun estado del componente se
      // toca dentro de catchError: si se tocara, el error se resolveria dos
      // veces. Todo ocurre en el subscribe, una sola vez.
      map((): ResultadoLogin => ({ ok: true })),
      catchError((error) => of<ResultadoLogin>({
        ok: false,
        status: error instanceof HttpErrorResponse ? error.status : 0,
      }))
    ).subscribe((resultado) => {
      this.loading.set(false);

      if (resultado.ok) {
        const user = this.authService.currentUser();
        if (user?.rol === 'estudiante') {
          this.router.navigate(['/alumno/home']);
        } else {
          this.router.navigate(['/home']);
        }
        return;
      }

      // Un solo mensaje por fallo: el 401 es credenciales incorrectas y el
      // timeout (status 0) tambien se reporta como credenciales incorrectas,
      // que es lo que el usuario espera ver, no un error tecnico en consola.
      if (resultado.status === 429) {
        this.startCooldown(30);
        this.errorMsg.set('Demasiados intentos. Espera antes de intentar de nuevo.');
        return;
      }

      this.errorMsg.set('Credenciales incorrectas');
    });
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(true);
    this.cooldownSeconds.set(seconds);
    this.cooldownTimer = setInterval(() => {
      const restante = this.cooldownSeconds() - 1;
      this.cooldownSeconds.set(restante);
      if (restante <= 0) {
        this.cooldown.set(false);
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = null;
        }
      }
    }, 1000);
  }
}
