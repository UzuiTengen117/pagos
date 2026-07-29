import { Routes } from '@angular/router';
import { Login } from './components/auth/login/login';
import { Register } from './components/auth/register/register';
import { ForgotPassword } from './components/auth/forgot-password/forgot-password';
import { Home } from './components/dashboard/home/home';
import { Pagos } from './components/pagos/pagos/pagos';
import { Alumnos } from './components/alumnos/alumnos/alumnos';
import { Profesores } from './components/profesores/profesores';
import { Precios } from './components/precios/precios/precios';
import { Becas } from './components/becas/becas/becas';
import { Comprobantes } from './components/comprobantes/comprobantes/comprobantes';
import { Inscripciones } from './components/inscripciones/inscripciones/inscripciones';
import { AlumnoHome } from './components/alumno/home/alumno-home';
import { AlumnoPagos } from './components/alumno/pagos/alumno-pagos';
import { AlumnoComprobantes } from './components/alumno/comprobantes/alumno-comprobantes';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'pagos', component: Pagos, canActivate: [authGuard] },
  { path: 'inscripciones', component: Inscripciones, canActivate: [authGuard] },
  { path: 'comprobantes', component: Comprobantes, canActivate: [authGuard] },
  { path: 'alumnos', component: Alumnos, canActivate: [authGuard] },
  { path: 'profesores', component: Profesores, canActivate: [authGuard] },
  { path: 'precios', component: Precios, canActivate: [authGuard] },
  { path: 'becas', component: Becas, canActivate: [authGuard] },
  { path: 'alumno/home', component: AlumnoHome, canActivate: [authGuard] },
  { path: 'alumno/pagos', component: AlumnoPagos, canActivate: [authGuard] },
  { path: 'alumno/comprobantes', component: AlumnoComprobantes, canActivate: [authGuard] },
  { path: '**', redirectTo: '/login' },
];
