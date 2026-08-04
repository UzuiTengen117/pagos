import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth';
import { RolUsuario } from '../models/usuario.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as RolUsuario[] | undefined;

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const user = authService.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.rol)) {
      if (user.rol === 'estudiante') {
        router.navigate(['/alumno/home']);
      } else {
        router.navigate(['/home']);
      }
      return false;
    }
  }

  return true;
};
