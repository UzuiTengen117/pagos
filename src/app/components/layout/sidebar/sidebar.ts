import { Component, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth';
import { PermisosService } from '../../../services/permisos';
import { Subscription, filter } from 'rxjs';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  roles: string[];
  permiso?: string;
  accion?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private permisosService = inject(PermisosService);
  private router = inject(Router);
  sidebarOpen = input<boolean>(true);
  closeSidebar = output<void>();

  currentUser = this.authService.currentUser;
  permisos: string[] = [];
  private routerSub?: Subscription;

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
    { label: 'Eventos', route: '/eventos', icon: 'eventos', roles: ['administrador', 'profesor'], permiso: 'eventos' },
    { label: 'Mis Pagos', route: '/alumno/pagos', icon: 'alumno-pagos', roles: ['estudiante'] },
    { label: 'Mis Comprobantes', route: '/alumno/comprobantes', icon: 'alumno-comprobantes', roles: ['estudiante'] },
    { label: 'Mis Solicitudes', route: '/alumno/solicitudes', icon: 'alumno-comprobantes', roles: ['estudiante'] },
    { label: 'Mis Eventos', route: '/alumno/eventos', icon: 'eventos', roles: ['estudiante'] },
    { label: 'Mi QR Asistencia', route: '/alumno/asistencia', icon: 'asistencia', roles: ['estudiante'] },
    { label: 'Tomar Asistencia', route: '/asistencia/escanear', icon: 'escanear', roles: ['administrador', 'profesor'], permiso: 'asistencias', accion: 'ver:tomar_asistencia' },
    { label: 'Reporte de Asistencias', route: '/asistencia/reporte', icon: 'reporte', roles: ['administrador', 'profesor'], permiso: 'asistencias', accion: 'ver:reporte_asistencias' },
    { label: 'Reporte de Inscripciones', route: '/eventos/reporte', icon: 'reporte', roles: ['administrador', 'profesor'], permiso: 'eventos', accion: 'ver_inscritos' },
    { label: 'Mi Perfil', route: '/perfil', icon: 'perfil', roles: ['administrador', 'profesor', 'estudiante'] },
  ];

  ngOnInit(): void {
    this.cargarPermisos();
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.cargarPermisos());
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private cargarPermisos(): void {
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
      if (item.accion) {
        return this.permisos.includes(`${item.permiso}:${item.accion}`);
      }
      return this.permisos.some(p => p.startsWith(`${item.permiso}:`));
    });
  }

  onClose(): void {
    this.closeSidebar.emit();
  }
}
