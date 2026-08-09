import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { PermisosService } from '../../../services/permisos';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
  permiso?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  authService = inject(AuthService);
  private permisosService = inject(PermisosService);
  sidebarOpen = input<boolean>(true);
  closeSidebar = output<void>();

  currentUser = this.authService.currentUser;
  permisos: string[] = [];

  menuItems: MenuItem[] = [
    { label: 'Inicio', route: '/home', icon: 'home', roles: ['administrador', 'profesor'] },
    { label: 'Mi Resumen', route: '/alumno/home', icon: 'home', roles: ['estudiante'] },
    { label: 'Pagos', route: '/pagos', icon: 'pagos', roles: ['administrador', 'profesor'], permiso: 'pagos' },
    { label: 'Inscripciones', route: '/inscripciones', icon: 'inscripciones', roles: ['administrador', 'profesor'], permiso: 'inscripciones' },
    { label: 'Comprobantes', route: '/comprobantes', icon: 'comprobantes', roles: ['administrador', 'profesor'], permiso: 'comprobantes' },
    { label: 'Registro de Alumnos', route: '/alumnos', icon: 'alumnos', roles: ['administrador', 'profesor'], permiso: 'alumnos' },
    { label: 'Registro de Usuarios', route: '/profesores', icon: 'usuarios', roles: ['administrador', 'profesor'], permiso: 'usuarios' },
    { label: 'Reembolsos', route: '/reembolsos', icon: 'reembolsos', roles: ['administrador', 'profesor'], permiso: 'solicitudes_reembolso' },
    { label: 'Precios', route: '/precios', icon: 'precios', roles: ['administrador', 'profesor'], permiso: 'precios' },
    { label: 'Becas', route: '/becas', icon: 'becas', roles: ['administrador', 'profesor'], permiso: 'becas' },
    { label: 'Mis Pagos', route: '/alumno/pagos', icon: 'alumno-pagos', roles: ['estudiante'] },
    { label: 'Mis Comprobantes', route: '/alumno/comprobantes', icon: 'alumno-comprobantes', roles: ['estudiante'] },
    { label: 'Mis Solicitudes', route: '/alumno/solicitudes', icon: 'alumno-comprobantes', roles: ['estudiante'] },
    { label: 'Mi Perfil', route: '/perfil', icon: 'perfil', roles: ['administrador', 'profesor', 'estudiante'] },
  ];

  constructor() {
    this.permisosService.getMisPermisos().subscribe({
      next: (res) => {
        this.permisos = res.permisos;
      },
      error: () => {
        this.permisos = [];
      }
    });
  }

  get filteredMenuItems() {
    const rol = this.currentUser()?.rol;
    return this.menuItems.filter(item => {
      if (!item.roles.includes(rol || 'estudiante')) return false;
      if (rol === 'administrador') return true;
      if (!item.permiso) return true;
      if (this.permisos.length === 0) return true;
      return this.permisos.some(p => p.startsWith(`${item.permiso}:`));
    });
  }

  onClose(): void {
    this.closeSidebar.emit();
  }
}
