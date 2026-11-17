import { http, HttpResponse } from 'msw';
import type { AdminNgo, NgoStatus, ReportDetail, ReportSummary, User } from '@/core/types/api';
import { db } from '../db';
import type { MockReport } from '../chats';
import { apiError, apiUrl, csrfError, mockDelay, unauthorized, validationError } from '../utils';

/** Moderação (fase 7): fila de ONGs, aprovar/rejeitar, fila de denúncias, detalhe e resolver — como no openapi.yaml. */

const STATUSES: NgoStatus[] = ['PENDENTE_APROVACAO', 'ATIVO', 'REJEITADO'];
const DAY = 24 * 3600 * 1000;

function admin(request: Request, { write = false } = {}) {
  if (write) {
    const csrf = csrfError(request);
    if (csrf) return { error: csrf };
  }
  const current = db.sessionUser();
  if (!current) return { error: unauthorized() };
  if (current.user.role !== 'ADMIN') {
    return { error: apiError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.') };
  }
  return { user: current.user };
}

/** Documento falso (cartão CNPJ em SVG) quando a ONG do seed não enviou arquivo. */
function mockDocument(u: User): string {
  const esc = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100" viewBox="0 0 850 1100">
<rect width="850" height="1100" fill="#fff"/><rect x="40" y="40" width="770" height="1020" fill="none" stroke="#333" stroke-width="3"/>
<text x="425" y="120" font-family="sans-serif" font-size="30" font-weight="700" text-anchor="middle">REPÚBLICA FEDERATIVA DO BRASIL</text>
<text x="425" y="170" font-family="sans-serif" font-size="24" text-anchor="middle">CADASTRO NACIONAL DA PESSOA JURÍDICA</text>
<text x="80" y="280" font-family="sans-serif" font-size="20" fill="#555">NÚMERO DE INSCRIÇÃO</text>
<text x="80" y="320" font-family="monospace" font-size="32">${esc(u.ngo_profile?.cnpj ?? '')}</text>
<text x="80" y="400" font-family="sans-serif" font-size="20" fill="#555">NOME EMPRESARIAL</text>
<text x="80" y="440" font-family="sans-serif" font-size="30">${esc(u.name.toUpperCase())}</text>
<text x="80" y="520" font-family="sans-serif" font-size="20" fill="#555">MUNICÍPIO / UF</text>
<text x="80" y="560" font-family="sans-serif" font-size="28">${esc(`${u.city} / ${u.state}`)}</text>
<text x="80" y="640" font-family="sans-serif" font-size="20" fill="#555">SITUAÇÃO CADASTRAL</text>
<text x="80" y="680" font-family="sans-serif" font-size="28">ATIVA</text>
<text x="425" y="1000" font-family="sans-serif" font-size="18" fill="#999" text-anchor="middle">Documento de exemplo (dados falsos do dev:mock)</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const ngoUsers = () => [...db.state.users.values()].map((m) => m.user).filter((u) => u.role === 'NGO' && u.ngo_profile);

/** Data de cadastro estável por ONG (o seed não guarda): dias atrás pela ordem. */
const createdAt = (u: User) =>
  new Date(Date.now() - (ngoUsers().findIndex((n) => n.id === u.id) + 1) * 2 * DAY).toISOString();

const toAdminNgo = (u: User): AdminNgo => ({
  ngo_profile_id: u.ngo_profile!.id,
  user_id: u.id,
  name: u.name,
  email: u.email,
  city: u.city,
  state: u.state,
  cnpj: u.ngo_profile!.cnpj,
  website: u.ngo_profile!.website,
  document_url: db.state.documents.get(u.id) ?? mockDocument(u),
  status: u.ngo_profile!.status,
  rejection_reason: u.ngo_profile!.rejection_reason,
  created_at: createdAt(u),
});

function party(id: string) {
  const u = db.state.users.get(id)?.user;
  return {
    id,
    name: u?.name ?? 'Usuário removido',
    role: (u?.role ?? 'DONOR') as 'DONOR' | 'NGO',
    avatar_url: u?.avatar_url ?? null,
    email: u?.email ?? '',
  };
}

function toSummary(r: MockReport): ReportSummary {
  const item = db.state.items.get(r.item_id);
  const { email: _a, ...reporter } = party(r.reporter_id);
  const { email: _b, ...reported } = party(r.reported_id);
  return {
    id: r.id,
    status: r.status,
    reason: r.reason,
    created_at: r.created_at,
    item: { id: r.item_id, title: item?.title ?? 'Item removido', status: item?.status ?? 'DISPONIVEL' },
    reporter,
    reported,
  };
}

const page = <T>(rows: T[], url: URL) => {
  const limit = Number(url.searchParams.get('limit') ?? 30);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  return { total: rows.length, data: rows.slice(offset, offset + limit) };
};

const reportNotFound = () => apiError(404, 'REPORT_NOT_FOUND', 'Denúncia não encontrada.');

export const adminHandlers = [
  http.get(apiUrl('/admin/ngos'), async ({ request }) => {
    await mockDelay();
    const { error } = admin(request);
    if (error) return error;
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') ?? 'PENDENTE_APROVACAO') as NgoStatus;
    if (!STATUSES.includes(status)) return validationError([{ path: 'status', message: 'Status inválido' }]);
    const rows = ngoUsers()
      .filter((u) => u.ngo_profile!.status === status)
      .map(toAdminNgo)
      .sort((a, b) => a.created_at!.localeCompare(b.created_at!));
    return HttpResponse.json(page(rows, url));
  }),

  http.patch(apiUrl('/admin/ngos/:ngoProfileId/status'), async ({ request, params }) => {
    await mockDelay();
    const { error } = admin(request, { write: true });
    if (error) return error;
    const target = ngoUsers().find((u) => u.ngo_profile!.id === params.ngoProfileId);
    if (!target) return apiError(404, 'NGO_NOT_FOUND', 'ONG não encontrada.');
    const body = (await request.json().catch(() => ({}))) as { status?: string; rejection_reason?: string };
    if (body.status !== 'ATIVO' && body.status !== 'REJEITADO') {
      return validationError([{ path: 'status', message: 'Use ATIVO ou REJEITADO' }]);
    }
    const reason = body.rejection_reason?.trim() ?? '';
    if (body.status === 'REJEITADO' && (reason.length < 10 || reason.length > 1000)) {
      return validationError([{ path: 'rejection_reason', message: 'Explique o motivo (de 10 a 1000 caracteres)' }]);
    }
    const ngo = target.ngo_profile!;
    ngo.status = body.status;
    ngo.rejection_reason = body.status === 'REJEITADO' ? reason : null;
    return HttpResponse.json({ id: ngo.id, status: ngo.status, rejection_reason: ngo.rejection_reason });
  }),

  http.get(apiUrl('/admin/reports'), async ({ request }) => {
    await mockDelay();
    const { error } = admin(request);
    if (error) return error;
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'ABERTA';
    if (status !== 'ABERTA' && status !== 'RESOLVIDA') {
      return validationError([{ path: 'status', message: 'Status inválido' }]);
    }
    const rows = [...db.state.reports.values()]
      .filter((r) => r.status === status)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toSummary);
    return HttpResponse.json(page(rows, url));
  }),

  http.get(apiUrl('/admin/reports/:reportId'), async ({ request, params }) => {
    await mockDelay();
    const { error } = admin(request);
    if (error) return error;
    const report = db.state.reports.get(String(params.reportId));
    if (!report) return reportNotFound();
    const item = db.state.items.get(report.item_id);
    const reported = party(report.reported_id);
    const body: ReportDetail = {
      report: { id: report.id, status: report.status, reason: report.reason, created_at: report.created_at },
      item: {
        id: report.item_id,
        title: item?.title ?? 'Item removido',
        status: item?.status ?? 'DISPONIVEL',
        donor_id: item?.donor_id ?? '',
        selected_ngo_id: item?.selected_ngo_id ?? null,
      },
      reporter: party(report.reporter_id),
      reported: {
        ...reported,
        ngo_profile_id: db.state.users.get(report.reported_id)?.user.ngo_profile?.id ?? null,
      },
      events: db.state.events
        .filter((e) => e.item_id === report.item_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
      // Todas as mensagens do item (inclusive de negociações anteriores), em ordem.
      messages: db.state.messages
        .filter((m) => m.item_id === report.item_id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    };
    return HttpResponse.json(body);
  }),

  http.patch(apiUrl('/admin/reports/:reportId'), async ({ request, params }) => {
    await mockDelay();
    const { error } = admin(request, { write: true });
    if (error) return error;
    const report = db.state.reports.get(String(params.reportId));
    if (!report) return reportNotFound();
    const body = (await request.json().catch(() => ({}))) as { status?: string };
    if (body.status !== 'RESOLVIDA') return validationError([{ path: 'status', message: 'Use RESOLVIDA' }]);
    report.status = 'RESOLVIDA';
    return HttpResponse.json(report);
  }),
];
