// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/core/api/http';
import {
  cancelNegotiation,
  confirmReceipt,
  fetchChats,
  fetchRoom,
  fetchUnread,
  markRead,
  reportChat,
  sendMessage,
} from '@/core/services/chats';
import { db, IDS } from '../db';
import { ITEM_IDS } from '../items';

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: ApiError) => e,
  );

/** Mocks do chat seguindo o openapi.yaml e a spec do WebSocket (regras de acesso, não lidas, transições). */
describe('mocks do chat', () => {
  it('lista por aba, atividade mais recente primeiro, com a outra parte e as não lidas', async () => {
    db.loginAs(IDS.donor);
    const active = await fetchChats('EM_PROGRESSO');
    expect(active.data.map((c) => c.item_id)).toEqual([ITEM_IDS.bike, ITEM_IDS.milk]);
    expect(active.data[0]).toMatchObject({
      item_title: 'Bicicleta aro 20',
      item_status: 'EM_PROGRESSO',
      counterpart: { id: IDS.ngoActive, name: 'ONG Salvadora', role: 'NGO' },
      last_message: { message: 'O endereço é Av. Paulista, 1000, sala 12.', sender_id: IDS.ngoActive },
      unread_count: 2,
    });
    expect((await fetchChats('DOADO')).data.map((c) => c.item_id)).toEqual([ITEM_IDS.babyClothes]);
    expect(await fetchUnread()).toEqual({ unread_messages: 2, unread_chats: 1 });

    db.loginAs(IDS.ngoActive);
    const ngo = await fetchChats('EM_PROGRESSO');
    expect(ngo.data.map((c) => c.counterpart.name)).toEqual(['Marina Souza']);

    db.loginAs(IDS.admin);
    expect(await fail(fetchChats('EM_PROGRESSO'))).toMatchObject({ status: 403 });
  });

  it('sala: só as duas partes; item disponível fecha (CHAT_CLOSED para o doador, 403 para os outros)', async () => {
    db.loginAs(IDS.donor);
    const room = await fetchRoom(ITEM_IDS.bike);
    expect(room.item).toMatchObject({ status: 'EM_PROGRESSO', selected_ngo_id: IDS.ngoActive });
    expect(room.messages).toHaveLength(5);
    const after = await fetchRoom(ITEM_IDS.bike, room.messages[2]!.created_at);
    expect(after.messages.map((m) => m.message)).toEqual(room.messages.slice(3).map((m) => m.message));
    expect(await fail(fetchRoom(ITEM_IDS.jeans))).toMatchObject({ status: 409, code: 'CHAT_CLOSED' });

    db.loginAs(IDS.ngoActive2);
    expect(await fail(fetchRoom(ITEM_IDS.bike))).toMatchObject({ status: 403 });
    expect(await fail(fetchRoom(ITEM_IDS.jeans))).toMatchObject({ status: 403 });
    expect(await fail(fetchRoom('00000000-0000-4000-8000-000000000000'))).toMatchObject({ status: 404 });
  });

  it('enviar marca como lida para quem envia e soma para quem recebe; ler zera', async () => {
    db.loginAs(IDS.donor);
    const message = await sendMessage(ITEM_IDS.bike, '  Até sábado!  ');
    expect(message).toMatchObject({ message: 'Até sábado!', sender_id: IDS.donor, receiver_id: IDS.ngoActive });
    expect(await fetchUnread()).toEqual({ unread_messages: 0, unread_chats: 0 });
    expect(await fail(sendMessage(ITEM_IDS.bike, '   '))).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await fail(sendMessage(ITEM_IDS.babyClothes, 'oi'))).toMatchObject({ status: 409, code: 'CHAT_CLOSED' });

    db.loginAs(IDS.ngoActive);
    expect(await fetchUnread()).toEqual({ unread_messages: 1, unread_chats: 1 });
    expect(await markRead(ITEM_IDS.bike)).toEqual({ unread_messages: 0, unread_chats: 0 });
  });

  it('confirmar recebimento: só a ONG escolhida, e só em negociação', async () => {
    db.loginAs(IDS.donor);
    expect(await fail(confirmReceipt(ITEM_IDS.bike))).toMatchObject({ status: 403 });
    db.loginAs(IDS.ngoActive);
    expect(await confirmReceipt(ITEM_IDS.bike)).toMatchObject({ item_id: ITEM_IDS.bike, status: 'DOADO' });
    expect(db.state.items.get(ITEM_IDS.bike)?.completed_at).toBeTruthy();
    expect(await fail(confirmReceipt(ITEM_IDS.bike))).toMatchObject({ status: 409, code: 'ITEM_NOT_IN_PROGRESS' });
    // A conversa continua legível, na aba Concluídas.
    expect((await fetchChats('DOADO')).data.map((c) => c.item_id)).toContain(ITEM_IDS.bike);
  });

  it('cancelar: volta para DISPONIVEL, sem ONG escolhida, e a conversa fecha', async () => {
    db.loginAs(IDS.ngoActive2);
    expect(await fail(cancelNegotiation(ITEM_IDS.bike))).toMatchObject({ status: 403 });
    db.loginAs(IDS.donor);
    expect(await fail(cancelNegotiation(ITEM_IDS.milk, 'x'.repeat(501)))).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await cancelNegotiation(ITEM_IDS.milk, 'Mudei de ideia')).toMatchObject({
      item_id: ITEM_IDS.milk,
      cancelled_by: 'DONOR',
    });
    expect(db.state.items.get(ITEM_IDS.milk)).toMatchObject({ status: 'DISPONIVEL', selected_ngo_id: null });
    expect(await fail(fetchRoom(ITEM_IDS.milk))).toMatchObject({ code: 'CHAT_CLOSED' });
    expect(await fail(cancelNegotiation(ITEM_IDS.milk))).toMatchObject({ code: 'ITEM_NOT_IN_PROGRESS' });
  });

  it('denunciar: motivo de 10 a 1000, uma aberta por pessoa e item, e não depois de cancelar', async () => {
    db.loginAs(IDS.donor);
    expect(await fail(reportChat(ITEM_IDS.bike, 'curto'))).toMatchObject({ code: 'VALIDATION_ERROR' });
    const report = await reportChat(ITEM_IDS.bike, 'Pediu dinheiro para buscar o item.');
    expect(report).toMatchObject({ reporter_id: IDS.donor, reported_id: IDS.ngoActive, status: 'ABERTA' });
    expect(await fail(reportChat(ITEM_IDS.bike, 'Mais uma vez a mesma coisa.'))).toMatchObject({
      code: 'ALREADY_REPORTED',
    });
    // Doada também pode ser denunciada; disponível não.
    expect(await reportChat(ITEM_IDS.babyClothes, 'Não apareceu no dia combinado.')).toMatchObject({
      status: 'ABERTA',
    });
    expect(await fail(reportChat(ITEM_IDS.jeans, 'Sem negociação nenhuma aqui.'))).toMatchObject({
      code: 'CHAT_CLOSED',
    });
  });
});
