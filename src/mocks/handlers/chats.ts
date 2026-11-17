import { http, HttpResponse } from 'msw';
import type { ChatSummary, Message, User } from '@/core/types/api';
import { AUTO_REPLIES } from '../chats';
import {
  chatItemsOf,
  counterpartId,
  isParticipant,
  markRead,
  pairMessages,
  participation,
  unreadCount,
  unreadSummary,
  type RuleError,
} from '../chatRules';
import { db } from '../db';
import type { MockItem } from '../items';
import { realtime } from '../realtime';
import { apiError, apiUrl, csrfError, mockDelay, unauthorized, validationError } from '../utils';

/** Handlers da fase 5 (conversas, mensagens, lidas, confirmar, cancelar, denunciar), como no openapi.yaml. */

const forbidden = () => apiError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');
const fail = (e: RuleError) => apiError(e.status, e.code, e.message);

function chatUser() {
  const current = db.sessionUser();
  if (!current) return { error: unauthorized() };
  if (current.user.role !== 'DONOR' && current.user.role !== 'NGO') return { error: forbidden() };
  return { user: current.user };
}

const counterpart = (item: MockItem, viewer: User) => {
  const other = db.state.users.get(counterpartId(item, viewer.id))?.user;
  return {
    id: other?.id ?? counterpartId(item, viewer.id),
    name: other?.name ?? 'Usuário removido',
    role: (other?.role ?? (viewer.role === 'DONOR' ? 'NGO' : 'DONOR')) as 'DONOR' | 'NGO',
    avatar_url: other?.avatar_url ?? null,
  };
};

/** Atividade mais recente: última mensagem do par, conclusão ou publicação. */
const activity = (item: MockItem) =>
  [pairMessages(item).at(-1)?.created_at, item.completed_at, item.created_at].filter(Boolean).sort().at(-1)!;

function toSummary(item: MockItem, viewer: User): ChatSummary {
  const last = pairMessages(item).at(-1);
  return {
    item_id: item.id,
    item_title: item.title,
    item_photo: item.photos[0]?.photo_url ?? '',
    item_status: item.status as 'EM_PROGRESSO' | 'DOADO',
    counterpart: counterpart(item, viewer),
    last_message: last ? { message: last.message, sender_id: last.sender_id, created_at: last.created_at } : null,
    unread_count: unreadCount(item, viewer.id),
  };
}

/** Grava a mensagem e publica os eventos como a API (exportada para os testes simularem a outra parte). */
export function insertMessage(item: MockItem, from: string, text: string): Message {
  // Sempre depois da última (o relógio do teste pode repetir o milissegundo).
  const last = pairMessages(item).at(-1)?.created_at;
  const now = new Date();
  if (last && now.toISOString() <= last) now.setTime(new Date(last).getTime() + 1);
  const message: Message = {
    id: crypto.randomUUID(),
    item_id: item.id,
    sender_id: from,
    receiver_id: counterpartId(item, from),
    message: text,
    created_at: now.toISOString(),
  };
  db.state.messages.push(message);
  markRead(item.id, from); // quem responde já leu o que recebeu
  realtime.toRoom(item.id, { type: 'message.created', item_id: item.id, message });
  realtime.unread(message.receiver_id, item.id);
  realtime.unread(from, item.id);
  return message;
}

/** No dev:mock, a outra parte responde em 2 s (para ver o tempo real). Nos testes, não. */
function scheduleAutoReply(item: MockItem, to: string) {
  if (import.meta.env.MODE === 'test') return;
  setTimeout(() => {
    const current = db.state.items.get(item.id);
    if (current?.status !== 'EM_PROGRESSO' || !isParticipant(current, to)) return;
    const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]!;
    insertMessage(current, counterpartId(current, to), reply);
  }, 2000);
}

export const chatHandlers = [
  http.get(apiUrl('/chats'), async ({ request }) => {
    await mockDelay();
    const { user, error } = chatUser();
    if (error) return error;
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    if (status && status !== 'EM_PROGRESSO' && status !== 'DOADO') {
      return validationError([{ path: 'status', message: 'Status inválido' }]);
    }
    const limit = Number(url.searchParams.get('limit') ?? 30);
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const chats = chatItemsOf(user.id)
      .filter((i) => !status || i.status === status)
      .sort((a, b) => activity(b).localeCompare(activity(a)));
    return HttpResponse.json({
      total: chats.length,
      data: chats.slice(offset, offset + limit).map((i) => toSummary(i, user)),
    });
  }),

  http.get(apiUrl('/chats/unread'), async () => {
    await mockDelay();
    const { user, error } = chatUser();
    if (error) return error;
    return HttpResponse.json(unreadSummary(user.id));
  }),

  http.post(apiUrl('/chats/:itemId/read'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = chatUser();
    if (error) return error;
    const access = participation(String(params.itemId), user.id);
    if ('error' in access) return fail(access.error);
    markRead(access.item.id, user.id);
    realtime.unread(user.id, access.item.id);
    return HttpResponse.json(unreadSummary(user.id));
  }),

  http.get(apiUrl('/chats/:itemId/messages'), async ({ request, params }) => {
    await mockDelay();
    const { user, error } = chatUser();
    if (error) return error;
    const access = participation(String(params.itemId), user.id);
    if ('error' in access) return fail(access.error);
    const { item } = access;
    const after = new URL(request.url).searchParams.get('after') ?? undefined;
    return HttpResponse.json({
      item: {
        id: item.id,
        title: item.title,
        status: item.status,
        donor_id: item.donor_id,
        selected_ngo_id: item.selected_ngo_id,
      },
      counterpart: counterpart(item, user),
      messages: pairMessages(item, after),
    });
  }),

  http.post(apiUrl('/chats/:itemId/messages'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = chatUser();
    if (error) return error;
    const access = participation(String(params.itemId), user.id);
    if ('error' in access) return fail(access.error);
    const { item } = access;
    const body = (await request.json().catch(() => null)) as { message?: unknown } | null;
    const text = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!text || text.length > 2000) {
      return validationError([{ path: 'message', message: 'Escreva de 1 a 2000 caracteres' }]);
    }
    if (item.status !== 'EM_PROGRESSO') {
      return apiError(409, 'CHAT_CLOSED', 'A doação foi concluída. A conversa é só para leitura.');
    }
    const message = insertMessage(item, user.id, text);
    scheduleAutoReply(item, user.id);
    return HttpResponse.json(message, { status: 201 });
  }),

  http.post(apiUrl('/items/:itemId/confirm-receipt'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = chatUser();
    if (error) return error;
    const item = db.state.items.get(String(params.itemId));
    if (!item) return apiError(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');
    if (user.role !== 'NGO' || item.selected_ngo_id !== user.id) return forbidden();
    if (user.ngo_profile?.status !== 'ATIVO')
      return apiError(403, 'NGO_NOT_APPROVED', 'Sua ONG ainda não foi aprovada.');
    if (item.status !== 'EM_PROGRESSO') {
      return apiError(409, 'ITEM_NOT_IN_PROGRESS', 'Este item não está em negociação.');
    }
    item.status = 'DOADO';
    item.completed_at = new Date().toISOString();
    realtime.toRoom(item.id, {
      type: 'item.status_changed',
      item_id: item.id,
      previous_status: 'EM_PROGRESSO',
      status: 'DOADO',
      changed_by: 'NGO',
      reason: null,
      completed_at: item.completed_at,
    });
    return HttpResponse.json({ item_id: item.id, status: 'DOADO', completed_at: item.completed_at });
  }),

  http.post(apiUrl('/items/:itemId/cancel'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = chatUser();
    if (error) return error;
    const item = db.state.items.get(String(params.itemId));
    if (!item) return apiError(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');
    if (!isParticipant(item, user.id)) return forbidden();
    if (item.status !== 'EM_PROGRESSO') {
      return apiError(409, 'ITEM_NOT_IN_PROGRESS', 'Este item não está em negociação.');
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: unknown };
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (reason.length > 500) return validationError([{ path: 'reason', message: 'Máximo de 500 caracteres' }]);
    const cancelledBy = user.role as 'DONOR' | 'NGO';
    item.status = 'DISPONIVEL';
    item.selected_ngo_id = null;
    realtime.toRoom(item.id, {
      type: 'item.status_changed',
      item_id: item.id,
      previous_status: 'EM_PROGRESSO',
      status: 'DISPONIVEL',
      changed_by: cancelledBy,
      reason: reason || null,
      completed_at: null,
    });
    realtime.closeRoom(item.id);
    return HttpResponse.json({
      item_id: item.id,
      previous_status: 'EM_PROGRESSO',
      current_status: 'DISPONIVEL',
      cancelled_by: cancelledBy,
      message: 'Negociação cancelada. O item voltou para a vitrine.',
    });
  }),

  http.post(apiUrl('/chats/:itemId/report'), async ({ request, params }) => {
    await mockDelay();
    const csrf = csrfError(request);
    if (csrf) return csrf;
    const { user, error } = chatUser();
    if (error) return error;
    const item = db.state.items.get(String(params.itemId));
    if (!item) return apiError(404, 'ITEM_NOT_FOUND', 'Item não encontrado.');
    if (item.status === 'DISPONIVEL') {
      return apiError(409, 'CHAT_CLOSED', 'Não há negociação aberta para denunciar.');
    }
    if (!isParticipant(item, user.id)) return forbidden();
    const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (reason.length < 10 || reason.length > 1000) {
      return validationError([{ path: 'reason', message: 'Escreva de 10 a 1000 caracteres' }]);
    }
    const open = [...db.state.reports.values()].some(
      (r) => r.item_id === item.id && r.reporter_id === user.id && r.status === 'ABERTA',
    );
    if (open) {
      return apiError(409, 'ALREADY_REPORTED', 'Você já denunciou esta negociação. A equipe está analisando.');
    }
    const report = {
      id: crypto.randomUUID(),
      item_id: item.id,
      reporter_id: user.id,
      reported_id: counterpartId(item, user.id),
      reason,
      status: 'ABERTA' as const,
      created_at: new Date().toISOString(),
    };
    db.state.reports.set(report.id, report);
    return HttpResponse.json(report, { status: 201 });
  }),
];
