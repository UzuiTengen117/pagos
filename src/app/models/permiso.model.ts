export interface SubcategoriaPermisos {
  label: string;
  acciones: { [accion: string]: string };
}

export interface ModuloPermisos {
  label: string;
  acciones?: { [accion: string]: string };
  subcategorias?: { [sub: string]: SubcategoriaPermisos };
  bloqueadas?: string[];
}

export interface ModulosPermisos {
  [modulo: string]: ModuloPermisos;
}

export interface PermisoSeleccion {
  modulo: string;
  accion: string;
}

export interface MisPermisos {
  permisos: string[];
  rol: string;
}
