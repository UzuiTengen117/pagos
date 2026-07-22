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
import { AlumnoHome } from './components/alumno/home/alumno-home';
import { AlumnoPagos } from './components/alumno/pagos/alumno-pagos';
import { AlumnoComprobantes } from './components/alumno/comprobantes/alumno-comprobantes';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'home', component: Home },
  { path: 'pagos', component: Pagos },
  { path: 'comprobantes', component: Comprobantes },
  { path: 'alumnos', component: Alumnos },
  { path: 'profesores', component: Profesores },
  { path: 'precios', component: Precios },
  { path: 'becas', component: Becas },
  { path: 'alumno/home', component: AlumnoHome },
  { path: 'alumno/pagos', component: AlumnoPagos },
  { path: 'alumno/comprobantes', component: AlumnoComprobantes },
  { path: '**', redirectTo: '/login' },
];
