import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { PaginacionComponent } from '../paginacion/paginacion';
import { paginar } from '../../utils/paginacion';
import { ProfesoresService } from '../../services/profesores';
import { RefreshService } from '../../services/refresh';
import { PermisosService } from '../../services/permisos';
import { AuthService } from '../../services/auth';
import { NotificationService } from '../../services/notification';
import { Usuario, RolUsuario } from '../../models/usuario.model';
import { ModulosPermisos, PermisoSeleccion } from '../../models/permiso.model';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginacionComponent],
  templateUrl: './profesores.html',
  styleUrl: './profesores.scss',
})
export class Profesores implements OnInit, OnDestroy {
  private profesoresService = inject(ProfesoresService);
  private refreshService = inject(RefreshService);
  private permisosService = inject(PermisosService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private routerSub?: Subscription;
  private refreshSub?: Subscription;

  allUsuarios: Usuario[] = [];
  usuarios: Usuario[] = [];
  pagina = 1;
  filtroRol: RolUsuario | 'todos' = 'todos';
  showModal = false;
  showDeleteModal = false;
  showRolModal = false;
  isEditing = false;
  usuarioToDelete: Usuario | null = null;
  usuarioRol: Usuario | null = null;
  nuevoRol: RolUsuario = 'profesor';

  modulosPermisos: ModulosPermisos | null = null;
  permisosUsuario: string[] = [];
  cargandoPermisos = false;
  private usuarioEnEdicion: Usuario | null = null;

  get esAdmin(): boolean {
    return this.authService.currentUser()?.rol === 'administrador';
  }

  formPassword = '';

  formData: Partial<Usuario> = this.getEmptyForm();

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.loadAllUsuarios());
    this.refreshSub = this.refreshService.refresh$.subscribe(() => this.loadAllUsuarios());
    this.loadAllUsuarios();
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.refreshSub?.unsubscribe();
  }

  loadAllUsuarios(): void {
    this.profesoresService.getAll().subscribe({
      next: (usuarios) => {
        this.allUsuarios = usuarios;
        this.pagina = 1;
        this.aplicarFiltro();
        this.cdr.detectChanges();
      },
      error: () => {
        this.allUsuarios = [];
        this.usuarios = [];
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltro(): void {
    if (this.filtroRol === 'administrador' && !this.esAdmin) {
      this.filtroRol = 'todos';
    }
    this.pagina = 1;
    if (this.filtroRol === 'todos') {
      this.usuarios = [...this.allUsuarios];
    } else {
      this.usuarios = this.allUsuarios.filter(u => u.rol === this.filtroRol);
    }
  }

  get usuariosPagina(): Usuario[] {
    return paginar(this.usuarios, this.pagina);
  }

  getEmptyForm(): Partial<Usuario> {
    return {
      nombre: '',
      primerApellido: '',  // requerido por el backend
      segundoApellido: '', // requerido por el backend
      username: '',
      email: '',
      rol: 'profesor',
    };
  }

  onFiltroRolChange(): void {
    this.aplicarFiltro();
  }

  onRolChange(): void {
    if (!this.isEditing) {
      this.cargarDefaultsParaRol(this.formData.rol || 'profesor');
    }
  }

  openCreateModal(): void {
    this.formData = this.getEmptyForm();
    this.isEditing = false;
    this.permisosUsuario = [];
    if (this.esAdmin) {
      this.cargarModulosPermisos();
      this.cargarDefaultsParaRol(this.formData.rol || 'profesor');
    }
    this.showModal = true;
  }

  openEditModal(usuario: Usuario): void {
    this.formData = { ...usuario };
    this.formPassword = '';
    this.isEditing = true;
    this.usuarioEnEdicion = usuario;
    this.permisosUsuario = [];
    if (this.esAdmin) {
      this.cargarModulosPermisos();
      this.cargarPermisosUsuario(usuario.id);
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formData = this.getEmptyForm();
    this.usuarioEnEdicion = null;
    this.permisosUsuario = [];
  }

  private cargarModulosPermisos(): void {
    if (this.modulosPermisos) return;
    this.permisosService.getModulos().subscribe({
      next: (modulos) => {
        this.modulosPermisos = modulos;
        this.cdr.detectChanges();
      },
      error: () => {
        this.modulosPermisos = null;
        this.cdr.detectChanges();
      }
    });
  }

  private cargarPermisosUsuario(id: number): void {
    this.cargandoPermisos = true;
    this.permisosService.getPermisosUsuario(id).subscribe({
      next: (res) => {
        this.permisosUsuario = res.permisos;
        this.cargandoPermisos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.permisosUsuario = [];
        this.cargandoPermisos = false;
        this.cdr.detectChanges();
      }
    });
  }

  private cargarDefaultsParaRol(rol: string): void {
    this.cargandoPermisos = true;
    const backendRol = rol === 'administrador' ? 'admin' : rol;
    this.permisosService.getDefaults(backendRol).subscribe({
      next: (res) => {
        this.permisosUsuario = res.permisos;
        this.cargandoPermisos = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.permisosUsuario = [];
        this.cargandoPermisos = false;
        this.cdr.detectChanges();
      }
    });
  }

  esPermisoActivo(modulo: string, accion: string, sub?: string): boolean {
    const clave = sub ? `${modulo}:${accion}:${sub}` : `${modulo}:${accion}`;
    return this.permisosUsuario.includes(clave);
  }

  togglePermiso(modulo: string, accion: string, sub?: string): void {
    const clave = sub ? `${modulo}:${accion}:${sub}` : `${modulo}:${accion}`;
    if (this.permisosUsuario.includes(clave)) {
      this.permisosUsuario = this.permisosUsuario.filter(p => p !== clave);
    } else {
      this.permisosUsuario = [...this.permisosUsuario, clave];
    }
  }

  esBloqueada(modulo: string, accion: string, sub: string): boolean {
    if (this.formData.rol === 'administrador') return false;
    const cfg = this.modulosPermisos?.[modulo];
    return Boolean(cfg?.bloqueadas?.includes(`${accion}:${sub}`));
  }

  get mostrarPermisos(): boolean {
    return this.esAdmin && this.formData.rol !== 'estudiante';
  }

  private construirSeleccionPermisos(): PermisoSeleccion[] {
    if (!this.modulosPermisos) return [];
    const seleccion: PermisoSeleccion[] = [];
    for (const [modulo, cfg] of Object.entries(this.modulosPermisos)) {
      if (cfg.subcategorias) {
        for (const [sub, subCfg] of Object.entries(cfg.subcategorias)) {
          for (const accion of Object.keys(subCfg.acciones)) {
            if (this.permisosUsuario.includes(`${modulo}:${accion}:${sub}`)) {
              seleccion.push({ modulo, accion: `${accion}:${sub}` });
            }
          }
        }
      } else {
        for (const accion of Object.keys(cfg.acciones || {})) {
          if (this.permisosUsuario.includes(`${modulo}:${accion}`)) {
            seleccion.push({ modulo, accion });
          }
        }
      }
    }
    return seleccion;
  }

  private guardarPermisos(usuarioId: number, seleccion?: PermisoSeleccion[]): void {
    if (!this.esAdmin) return;
    const lista = seleccion ?? this.construirSeleccionPermisos();
    if (!this.modulosPermisos) return;
    this.permisosService.updatePermisos(usuarioId, lista).subscribe({
      next: () => this.notificationService.success('Permisos actualizados correctamente'),
      error: () => this.notificationService.error('No se pudieron guardar los permisos')
    });
  }

  openDeleteModal(usuario: Usuario): void {
    this.usuarioToDelete = usuario;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.usuarioToDelete = null;
  }

  openRolModal(usuario: Usuario): void {
    this.usuarioRol = usuario;
    this.nuevoRol = usuario.rol;
    this.showRolModal = true;
  }

  closeRolModal(): void {
    this.showRolModal = false;
    this.usuarioRol = null;
  }

  saveUsuario(): void {
    // Validación de campos obligatorios antes de enviar al backend
    if (!this.formData.nombre?.trim()) {
      this.notificationService.error('El nombre es obligatorio');
      return;
    }
    if (!this.formData.primerApellido?.trim()) {
      this.notificationService.error('El primer apellido es obligatorio');
      return;
    }
    if (!this.formData.username?.trim()) {
      this.notificationService.error('El nombre de usuario es obligatorio');
      return;
    }
    if (!this.formData.email?.trim()) {
      this.notificationService.error('El email es obligatorio');
      return;
    }
    // Password solo obligatorio al crear (no al editar)
    if (!this.isEditing && !this.formPassword?.trim()) {
      this.notificationService.error('La contraseña es obligatoria');
      return;
    }

    const seleccion = this.construirSeleccionPermisos();
    const sinPermisos = this.formData.rol === 'estudiante';
    if (this.isEditing && this.formData.id) {
      // Actualizar usuario existente
      this.profesoresService.update(this.formData as Usuario, this.formPassword || undefined).subscribe({
        next: (res) => {
          const usuarioId = this.usuarioEnEdicion?.id;
          this.closeModal();
          if (usuarioId && !sinPermisos) {
            this.guardarPermisos(usuarioId, seleccion);
          }
          this.loadAllUsuarios();
          this.notificationService.success('Usuario actualizado correctamente');
        },
        error: (err) => {
          // Muestra error del backend o genérico
          const mensaje = err?.error?.message || 'No se pudo actualizar el usuario';
          this.notificationService.error(mensaje);
          this.loadAllUsuarios();
        }
      });
    } else {
      // Crear nuevo usuario
      this.profesoresService.create(this.formData, this.formPassword || undefined).subscribe({
        next: (res) => {
          this.closeModal();
          if (!sinPermisos) {
            this.guardarPermisos(res.usuario?.id || res.id, seleccion);
          }
          this.loadAllUsuarios();
          this.notificationService.success('Usuario creado correctamente');
        },
        error: (err) => {
          // Muestra error del backend o genérico
          const mensaje = err?.error?.message || 'No se pudo crear el usuario';
          this.notificationService.error(mensaje);
          this.loadAllUsuarios();
        }
      });
    }
  }

  deleteUsuario(): void {
    // Elimina usuario y muestra notificación de éxito/error
    if (this.usuarioToDelete) {
      this.profesoresService.delete(this.usuarioToDelete.id).subscribe({
        next: () => {
          this.closeDeleteModal();
          this.loadAllUsuarios();
          this.notificationService.success('Usuario eliminado correctamente');
        },
        error: (err) => {
          const mensaje = err?.error?.message || 'No se pudo eliminar el usuario';
          this.notificationService.error(mensaje);
          this.closeDeleteModal();
          this.loadAllUsuarios();
        }
      });
    }
  }

  cambiarRol(): void {
    // Cambia rol de usuario y muestra notificación de éxito/error
    if (this.usuarioRol) {
      this.profesoresService.cambiarRol(this.usuarioRol.id, this.nuevoRol).subscribe({
        next: () => {
          this.closeRolModal();
          this.loadAllUsuarios();
          this.notificationService.success('Rol cambiado correctamente');
        },
        error: (err) => {
          const mensaje = err?.error?.message || 'No se pudo cambiar el rol';
          this.notificationService.error(mensaje);
          this.closeRolModal();
          this.loadAllUsuarios();
        }
      });
    }
  }
}
