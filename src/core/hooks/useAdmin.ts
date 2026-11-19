import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import { ADMIN_PAGE_SIZE, fetchAdminNgos, fetchReport, fetchReports, type ReportStatus } from '../services/admin';
import type { AdminNgo, NgoStatus, Paginated, ReportKind, ReportSummary } from '../types/api';

export const NGO_STATUSES: NgoStatus[] = ['PENDENTE_APROVACAO', 'ATIVO', 'REJEITADO'];

/** Junta as páginas do scroll infinito. Próxima página enquanto `offset + recebidos < total`. */
function infinite<T>(pages: InfiniteData<Paginated<T>>) {
  return { items: pages.pages.flatMap((p) => p.data), total: pages.pages[0]?.total ?? 0 };
}
const nextOffset = <T>(last: Paginated<T>, all: Paginated<T>[]) => {
  const loaded = (all.length - 1) * ADMIN_PAGE_SIZE + last.data.length;
  return loaded < last.total ? all.length * ADMIN_PAGE_SIZE : undefined;
};

/** Tudo do Admin fica sob `['admin']`: aprovar, rejeitar e resolver invalidam de uma vez. */
export const adminNgosKey = (status: NgoStatus) => ['admin', 'ngos', status] as const;

/** Fila de ONGs por status (guia, F5). */
export function useAdminNgos(status: NgoStatus) {
  return useInfiniteQuery({
    queryKey: adminNgosKey(status),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchAdminNgos(status, pageParam),
    getNextPageParam: nextOffset<AdminNgo>,
    select: infinite<AdminNgo>,
    // O link do documento expira em 10 minutos: a lista é buscada de novo depois de 8.
    staleTime: 8 * 60 * 1000,
  });
}

/**
 * Uma ONG pelo `ngo_profile_id`, em qualquer status (atalho vindo da denúncia, que não diz o status).
 * Procura nas três filas, uma página grande de cada.
 */
export function useAdminNgoLookup(ngoProfileId: string | null) {
  return useQuery({
    queryKey: ['admin', 'ngo', ngoProfileId],
    enabled: Boolean(ngoProfileId),
    staleTime: 8 * 60 * 1000,
    queryFn: async (): Promise<AdminNgo | null> => {
      for (const status of NGO_STATUSES) {
        const found = (await fetchAdminNgos(status, 0, 50)).data.find((n) => n.ngo_profile_id === ngoProfileId);
        if (found) return found;
      }
      return null;
    },
  });
}

/** Fila de denúncias por status e tipo (guia, F11 e F11b); sem tipo, as duas. */
export function useReports(status: ReportStatus, kind?: ReportKind) {
  return useInfiniteQuery({
    queryKey: ['admin', 'reports', status, kind ?? 'ALL'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchReports(status, kind, pageParam),
    getNextPageParam: nextOffset<ReportSummary>,
    select: infinite<ReportSummary>,
  });
}

export const reportKey = (id: string) => ['admin', 'report', id] as const;

export function useReport(id: string) {
  return useQuery({ queryKey: reportKey(id), queryFn: () => fetchReport(id), enabled: Boolean(id) });
}
