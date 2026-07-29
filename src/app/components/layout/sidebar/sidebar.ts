import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  authService = inject(AuthService);
  sidebarOpen = input<boolean>(true);
  closeSidebar = output<void>();

  currentUser = this.authService.currentUser;

  menuItems = [
    { label: 'Inicio', route: '/home', icon: 'home', roles: ['administrador', 'profesor'] },
    { label: 'Mi Resumen', route: '/alumno/home', icon: 'home', roles: ['estudiante'] },
    { label: 'Pagos', route: '/pagos', icon: 'pagos', roles: ['administrador', 'profesor'] },
    { label: 'Inscripciones', route: '/inscripciones', icon: 'inscripciones', roles: ['administrador', 'profesor'] },
    { label: 'Comprobantes', route: '/comprobantes', icon: 'comprobantes', roles: ['administrador', 'profesor'] },
    { label: 'Registro de Alumnos', route: '/alumnos', icon: 'alumnos', roles: ['administrador', 'profesor'] },
    { label: 'Registro de Usuarios', route: '/profesores', icon: 'usuarios', roles: ['administrador'] },
    { label: 'Precios', route: '/precios', icon: 'precios', roles: ['administrador'] },
    { label: 'Becas', route: '/becas', icon: 'becas', roles: ['administrador'] },
    { label: 'Mis Pagos', route: '/alumno/pagos', icon: 'alumno-pagos', roles: ['estudiante'] },
    { label: 'Mis Comprobantes', route: '/alumno/comprobantes', icon: 'alumno-comprobantes', roles: ['estudiante'] },
  ];

  get filteredMenuItems() {
    const rol = this.currentUser()?.rol;
    return this.menuItems.filter(item => item.roles.includes(rol || 'estudiante'));
  }

  onClose(): void {
    this.closeSidebar.emit();
  }
}
