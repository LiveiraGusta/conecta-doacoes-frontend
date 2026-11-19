import { api } from '../api/http';
import type {
  AdminNgo,
  ModerationResult,
  NgoStatus,
  Paginated,
  Report,
  ReportDetail,
  ReportKind,
  ReportSummary,
} from '../types/api';

export type ReportStatus = 'ABERTA' | 'RESOLVIDA';

/** Itens por página nas filas do Admin. */
export const ADMIN_PAGE_SIZE = 20;

/** Fila de ONGs por status, mais antigas primeiro. `document_url` é assinada e expira em 10 minutos. */
export const fetchAdminNgos = (status: NgoStatus, offset: number, limit = ADMIN_PAGE_SIZE) =>
  api<Paginated<AdminNgo>>('/admin/ngos', { query: { status, limit, offset } });

/** Aprovar ou rejeitar (motivo de 10 a 1000 caracteres, obrigatório para rejeitar). */
export const setNgoStatus = (ngoProfileId: string, status: 'ATIVO' | 'REJEITADO', reason?: string) =>
  api<{ id: string; status: 'ATIVO' | 'REJEITADO'; rejection_reason: string | null }>(
    `/admin/ngos/${ngoProfileId}/status`,
    { method: 'PATCH', json: status === 'REJEITADO' ? { status, rejection_reason: reason } : { status } },
  );

/** Fila de denúncias por status (e tipo, opcional), mais antigas primeiro. */
export const fetchReports = (status: ReportStatus, kind: ReportKind | undefined, offset: number) =>
  api<Paginated<ReportSummary>>('/admin/reports', {
    query: kind ? { status, kind, limit: ADMIN_PAGE_SIZE, offset } : { status, limit: ADMIN_PAGE_SIZE, offset },
  });

/** Denúncia com as partes, os eventos do item e todas as mensagens. */
export const fetchReport = (id: string) => api<ReportDetail>(`/admin/reports/${id}`);

/**
 * Tira o anúncio do ar de vez (motivo de 10 a 500, mostrado ao doador). Cancela a negociação em andamento
 * e resolve todas as denúncias de anúncio abertas do item. Idempotente.
 */
export const removeItem = (itemId: string, reason: string) =>
  api<ModerationResult>(`/admin/items/${itemId}/remove`, { method: 'POST', json: { reason } });

/** Mantém (ou republica) o anúncio e descarta as denúncias de anúncio abertas como improcedentes. */
export const restoreItem = (itemId: string) =>
  api<ModerationResult>(`/admin/items/${itemId}/restore`, { method: 'POST' });

/** Idempotente: resolver de novo devolve a denúncia como está. Denúncia de anúncio aberta dá 409. */
export const resolveReport = (id: string) =>
  api<Report>(`/admin/reports/${id}`, { method: 'PATCH', json: { status: 'RESOLVIDA' } });
