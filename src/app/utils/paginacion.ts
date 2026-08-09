export const PAGE_SIZE = 20;

export function paginar<T>(items: T[], pagina: number, pageSize = PAGE_SIZE): T[] {
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const paginaClamped = Math.min(Math.max(1, pagina), totalPaginas);
  const start = (paginaClamped - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
