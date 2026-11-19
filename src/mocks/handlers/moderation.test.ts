// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/core/api/http';
import { fetchReport, fetchReports, removeItem, resolveReport, restoreItem } from '@/core/services/admin';
import { fetchFeed, fetchItem, fetchMyItems, fetchPublicFeed, reportItem, selectNgo } from '@/core/services/items';
import { REPORT_IDS } from '../chats';
import { db, IDS } from '../db';
import { ITEM_IDS } from '../items';

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: ApiError) => e,
  );
const moderation = (id: string) => db.state.items.get(id)!.moderation_status;

/** Denúncia de anúncio e moderação nos mocks, com as mesmas regras da API (guia, F11b). */
describe('mocks da denúncia de anúncio', () => {
  it('ONG ou doador denuncia; a denunciada é o doador; segunda aberta é 409 ITEM_ALREADY_REPORTED', async () => {
    db.loginAs(IDS.ngoActive);
    const report = await reportItem(ITEM_IDS.jeans, 'ODIO', 'Texto ofensivo na descrição.');
    expect(report).toMatchObject({
      kind: 'ITEM',
      category: 'ODIO',
      reported_id: IDS.donor,
      status: 'ABERTA',
      resolution: null,
    });
    expect(await fail(reportItem(ITEM_IDS.jeans, 'NUDEZ'))).toMatchObject({
      status: 409,
      code: 'ITEM_ALREADY_REPORTED',
    });
    // A denúncia de negociação do mesmo usuário é outra coisa e não conflita.
    expect(moderation(ITEM_IDS.jeans)).toBe('VISIVEL');
  });

  it('validação, o próprio doador (403) e item inexistente (404)', async () => {
    db.loginAs(IDS.ngoActive);
    expect(await fail(reportItem(ITEM_IDS.jeans, 'OUTRO'))).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await fail(reportItem(ITEM_IDS.jeans, 'OUTRO', 'curto'))).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(await fail(reportItem('00000000-0000-4000-8000-000000000000', 'SPAM'))).toMatchObject({ status: 404 });
    db.loginAs(IDS.donor);
    expect(await fail(reportItem(ITEM_IDS.jeans, 'SPAM'))).toMatchObject({ status: 403 });
  });

  it('com 3 pessoas o anúncio fica oculto: sai do feed e só o doador abre o detalhe', async () => {
    for (const who of [IDS.ngoActive, IDS.donor2, IDS.ngoActive2]) {
      db.loginAs(who);
      await reportItem(ITEM_IDS.jeans, 'NUDEZ');
    }
    expect(moderation(ITEM_IDS.jeans)).toBe('OCULTO');

    db.loginAs(null);
    expect((await fetchPublicFeed({}, 0)).data.some((i) => i.id === ITEM_IDS.jeans)).toBe(false);
    db.loginAs(IDS.ngoActive);
    expect((await fetchFeed({}, 0)).data.some((i) => i.id === ITEM_IDS.jeans)).toBe(false);
    expect(await fail(fetchItem(ITEM_IDS.jeans))).toMatchObject({ status: 404 });

    db.loginAs(IDS.donor);
    expect(await fetchItem(ITEM_IDS.jeans)).toMatchObject({ moderation_status: 'OCULTO', moderation_reason: null });
    const mine = await fetchMyItems(undefined, 0);
    expect(mine.data.find((i) => i.id === ITEM_IDS.jeans)).toMatchObject({ moderation_status: 'OCULTO' });
    expect(await fail(selectNgo(ITEM_IDS.jeans, IDS.ngoActive2))).toMatchObject({ code: 'ITEM_UNDER_REVIEW' });
  });

  it('fila filtra por tipo; PATCH numa denúncia de anúncio aberta é 409; detalhe sem a conversa', async () => {
    db.loginAs(IDS.admin);
    const items = await fetchReports('ABERTA', 'ITEM', 0);
    expect(items.total).toBe(3);
    expect(items.data[0]).toMatchObject({
      kind: 'ITEM',
      category: 'NUDEZ',
      item: { id: ITEM_IDS.magazines, moderation_status: 'OCULTO' },
    });
    expect((await fetchReports('ABERTA', undefined, 0)).total).toBe(4);
    expect(await fail(resolveReport(REPORT_IDS.itemOpen))).toMatchObject({ status: 409, code: 'CONFLICT' });

    const detail = await fetchReport(REPORT_IDS.itemOpen);
    expect(detail.item).toMatchObject({ description: 'Caixa com revistas dos anos 90.', moderation_status: 'OCULTO' });
    expect(detail.item?.photos).toHaveLength(3);
    expect(detail.item_reports?.map((r) => r.category)).toEqual(['NUDEZ', 'NUDEZ', 'OUTRO']);
    expect(detail.messages).toEqual([]);
  });

  it('remover item em negociação: cancela, resolve as denúncias e o doador vê o motivo', async () => {
    db.loginAs(IDS.admin);
    const result = await removeItem(ITEM_IDS.bike, 'Foto com conteúdo impróprio.');
    expect(result).toEqual({
      item_id: ITEM_IDS.bike,
      status: 'DISPONIVEL',
      moderation_status: 'REMOVIDO',
      moderation_reason: 'Foto com conteúdo impróprio.',
      cancelled_negotiation: true,
      resolved_reports: 0,
    });
    expect(db.state.events.filter((e) => e.item_id === ITEM_IDS.bike).map((e) => e.to_status)).toContain('CANCELADO');
    expect(await fail(removeItem(ITEM_IDS.bike, 'curto'))).toMatchObject({ code: 'VALIDATION_ERROR' });

    db.loginAs(IDS.donor);
    expect(await fetchItem(ITEM_IDS.bike)).toMatchObject({ moderation_reason: 'Foto com conteúdo impróprio.' });
    expect(await fail(selectNgo(ITEM_IDS.bike, IDS.ngoActive))).toMatchObject({ code: 'ITEM_REMOVED' });
  });

  it('manter: volta ao feed e as denúncias ficam improcedentes', async () => {
    db.loginAs(IDS.admin);
    expect(await restoreItem(ITEM_IDS.magazines)).toMatchObject({ moderation_status: 'VISIVEL', resolved_reports: 3 });
    const resolved = await fetchReports('RESOLVIDA', 'ITEM', 0);
    expect(resolved.data.every((r) => r.resolution === 'IMPROCEDENTE')).toBe(true);
    db.loginAs(null);
    expect((await fetchPublicFeed({}, 0)).data.some((i) => i.id === ITEM_IDS.magazines)).toBe(true);
  });
});
