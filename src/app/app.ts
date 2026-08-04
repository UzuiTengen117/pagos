import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Sidebar } from './components/layout/sidebar/sidebar';
import { Header } from './components/layout/header/header';
import { ToastComponent } from './components/notification/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, Sidebar, Header, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('sistema-de-pagos');
  sidebarOpen = signal(false);
  showLayout = signal(false);
  pageTitle = signal('Inicio');

  private pageTitles: { [key: string]: string } = {
    '/home': 'Inicio',
    '/pagos': 'Pagos',
    '/inscripciones': 'Inscripciones',
    '/comprobantes': 'Comprobantes de Pago',
    '/alumnos': 'Registro de Alumnos',
    '/profesores': 'Registro de Usuarios',
    '/precios': 'Precios',
    '/becas': 'Becas',
    '/alumno/home': 'Mi Resumen',
    '/alumno/pagos': 'Mis Pagos',
    '/alumno/comprobantes': 'Mis Comprobantes',
  };

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEnd = event as NavigationEnd;
        const isAuth = ['/login', '/register', '/forgot-password'].includes(navEnd.urlAfterRedirects || navEnd.url);
        this.showLayout.set(!isAuth);
        this.pageTitle.set(this.pageTitles[navEnd.urlAfterRedirects || navEnd.url] || 'Inicio');
        this.sidebarOpen.set(false);
      });
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
