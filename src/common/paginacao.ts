// Mesmo contrato de listagem do MS Moradores: ?page=1&pageSize=20 -> { data, total, page, pageSize, totalPages }.
export const PAGE_SIZE_PADRAO = 20;
export const PAGE_SIZE_MAXIMO = 500;

export interface ParamsPagina {
  page?: number;
  pageSize?: number;
}

export function normalizarPagina(p: ParamsPagina) {
  const page = p.page && p.page > 0 ? p.page : 1;
  const pageSize = p.pageSize && p.pageSize > 0 ? Math.min(p.pageSize, PAGE_SIZE_MAXIMO) : PAGE_SIZE_PADRAO;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function respostaPaginada<T>(data: T[], total: number, page: number, pageSize: number) {
  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
