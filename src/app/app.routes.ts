import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/auth/login/login').then(m => m.Login) },

  { path: 'home', loadComponent: () => import('./components/dashboard/home/home').then(m => m.Home), canActivate: [authGuard] },
  { path: 'pagos', loadComponent: () => import('./components/pagos/pagos/pagos').then(m => m.Pagos), canActivate: [authGuard] },
  { path: 'inscripciones', loadComponent: () => import('./components/inscripciones/inscripciones/inscripciones').then(m => m.Inscripciones), canActivate: [authGuard] },
  { path: 'comprobantes', loadComponent: () => import('./components/comprobantes/comprobantes/comprobantes').then(m => m.Comprobantes), canActivate: [authGuard] },
  { path: 'alumnos', loadComponent: () => import('./components/alumnos/alumnos/alumnos').then(m => m.Alumnos), canActivate: [authGuard] },
  { path: 'perfil', loadComponent: () => import('./components/perfil/perfil').then(m => m.Perfil), canActivate: [authGuard] },

  { path: 'profesores', loadComponent: () => import('./components/profesores/profesores').then(m => m.Profesores), canActivate: [authGuard, roleGuard], data: { roles: ['administrador'] } },
  { path: 'precios', loadComponent: () => import('./components/precios/precios/precios').then(m => m.Precios), canActivate: [authGuard, roleGuard], data: { roles: ['administrador'] } },
  { path: 'becas', loadComponent: () => import('./components/becas/becas/becas').then(m => m.Becas), canActivate: [authGuard, roleGuard], data: { roles: ['administrador'] } },

  { path: 'alumno/home', loadComponent: () => import('./components/alumno/home/alumno-home').then(m => m.AlumnoHome), canActivate: [authGuard] },
  { path: 'alumno/pagos', loadComponent: () => import('./components/alumno/pagos/alumno-pagos').then(m => m.AlumnoPagos), canActivate: [authGuard] },
  { path: 'alumno/comprobantes', loadComponent: () => import('./components/alumno/comprobantes/alumno-comprobantes').then(m => m.AlumnoComprobantes), canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
