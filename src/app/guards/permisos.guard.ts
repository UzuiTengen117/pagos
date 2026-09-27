import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth';
import { PermisosService } from '../services/permisos';

export const permisosGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const permisosService = inject(PermisosService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const modulo = route.data['permisoModulo'] as string | undefined;
  if (!modulo) {
    return true;
  }

  if (authService.currentUser()?.rol === 'administrador') {
    return true;
  }

  // Con `permisoAccion` se exige esa acción concreta en vez de cualquier acción
  // del módulo: ver una clase en vivo no debe implicar el historial completo.
  const accion = route.data['permisoAccion'] as string | undefined;
  const cumple = accion
    ? (permisos: string[]) => permisos.includes(`${modulo}:${accion}`)
    : (permisos: string[]) => permisos.some(p => p.startsWith(`${modulo}:`));

  return permisosService.getMisPermisos().pipe(
    map(res => {
      const ok = cumple(res.permisos);
      if (!ok) {
        const rol = authService.currentUser()?.rol;
        if (rol === 'estudiante') {
          router.navigate(['/alumno/home']);
        } else {
          router.navigate(['/home']);
        }
      }
      return ok;
    }),
    catchError(() => of(true))
  );
};
