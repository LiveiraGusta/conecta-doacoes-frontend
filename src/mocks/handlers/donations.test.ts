// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/core/api/http';
import {
  createItem,
  fetchInterests,
  fetchItem,
  fetchMyItems,
  selectNgo,
  type NewItemInput,
} from '@/core/services/items';
import { db, IDS } from '../db';
import { ITEM_IDS } from '../items';

const photo = (name = 'foto.webp', type = 'image/webp', size = 10) => new File([new Uint8Array(size)], name, { type });
const input = (patch: Partial<NewItemInput> = {}): NewItemInput => ({
  title: 'Mochila escolar',
  category: 'ROUPAS',
  description: 'Azul, pouco usada.',
  notes: 'Retirar à noite.',
  photos: [photo('a.webp'), photo('b.webp'), photo('c.webp')],
  ...patch,
});
const apiError = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: ApiError) => e,
  );

/** Mocks da fase 4 seguindo o openapi.yaml: publicar, minhas doações/interesses, interessadas e escolher ONG. */
describe('mocks de doações', () => {
  it('publicar: doador envia 3 fotos na ordem; item nasce DISPONIVEL na cidade dele e aparece primeiro', async () => {
    db.loginAs(IDS.donor);
    const item = await createItem(input());
    expect(item).toMatchObject({
      title: 'Mochila escolar',
      notes: 'Retirar à noite.',
      status: 'DISPONIVEL',
      city: 'São Paulo',
      state: 'SP',
      donor_id: IDS.donor,
      selected_ngo_id: null,
    });
    expect(item.photos.map((p) => p.id)).toEqual([1, 2, 3].map((n) => `${item.id}-foto-${n}`));

    const mine = await fetchMyItems(undefined, 0);
    expect(mine.data[0]?.id).toBe(item.id);
  });

  it('publicar: regras de fotos, campos e perfil', async () => {
    db.loginAs(IDS.donor);
    expect(await apiError(createItem(input({ photos: [photo()] })))).toMatchObject({ code: 'INVALID_PHOTO_COUNT' });
    expect(
      await apiError(createItem(input({ photos: [photo(), photo(), photo('x.gif', 'image/gif')] }))),
    ).toMatchObject({ code: 'INVALID_PHOTO' });
    expect(
      await apiError(createItem(input({ photos: [photo(), photo(), photo('g.webp', 'image/webp', 6 * 1024 * 1024)] }))),
    ).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' });
    const invalid = await apiError(createItem(input({ title: 'ab', notes: 'x'.repeat(1001) })));
    expect(invalid).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(invalid?.details?.map((d) => d.path)).toEqual(['title', 'notes']);

    db.loginAs(IDS.ngoActive);
    expect(await apiError(createItem(input()))).toMatchObject({ status: 403 });
  });

  it('minhas doações (doador) com filtro de status, paginação e contagem de interessadas', async () => {
    db.loginAs(IDS.donor);
    const all = await fetchMyItems(undefined, 0);
    expect(all.total).toBe(9);
    expect(all.data.every((i) => i.donor?.id === IDS.donor)).toBe(true);
    expect((await fetchMyItems('DOADO', 0)).total).toBe(1);
    expect((await fetchMyItems('EM_PROGRESSO', 0)).total).toBe(2);
    const page = await fetchMyItems(undefined, 8, 4);
    expect(page.data).toHaveLength(1);
    const basket = (await fetchMyItems('DISPONIVEL', 0)).data.find((i) => i.id === ITEM_IDS.basket);
    expect(basket?.interests_count).toBe(3);
  });

  it('meus interesses (ONG): os itens que ela curtiu, inclusive o escolhido e o doado', async () => {
    db.loginAs(IDS.ngoActive);
    const mine = await fetchMyItems(undefined, 0);
    expect(mine.data.map((i) => i.id).sort()).toEqual([ITEM_IDS.basket, ITEM_IDS.bike, ITEM_IDS.babyClothes].sort());
    const bike = mine.data.find((i) => i.id === ITEM_IDS.bike);
    expect(bike).toMatchObject({ is_selected: true, status: 'EM_PROGRESSO' });
  });

  it('interessadas: só o dono vê; ATIVO primeiro, depois pela data do like', async () => {
    db.loginAs(IDS.donor);
    const list = await fetchInterests(ITEM_IDS.basket);
    expect(list.total).toBe(3);
    expect(list.interested_ngos.map((n) => n.name)).toEqual(['Casa do Bem', 'ONG Salvadora', 'Casa Esperança']);
    expect(list.interested_ngos[2]).toMatchObject({ ngo_status: 'REJEITADO', cnpj: '12.345.678/0001-95' });

    db.loginAs(IDS.donor2);
    expect(await apiError(fetchInterests(ITEM_IDS.basket))).toMatchObject({ status: 403 });
    db.loginAs(IDS.ngoActive);
    expect(await apiError(fetchInterests(ITEM_IDS.basket))).toMatchObject({ status: 403 });
  });

  it('escolher ONG: abre a negociação e devolve a sala; regras de 409', async () => {
    db.loginAs(IDS.donor);
    expect(await apiError(selectNgo(ITEM_IDS.basket, IDS.ngoRejected))).toMatchObject({ code: 'NGO_NOT_ACTIVE' });
    expect(await apiError(selectNgo(ITEM_IDS.basket, IDS.ngoPending))).toMatchObject({ code: 'NGO_NOT_INTERESTED' });

    const selection = await selectNgo(ITEM_IDS.basket, IDS.ngoActive);
    expect(selection).toEqual({
      item_id: ITEM_IDS.basket,
      status: 'EM_PROGRESSO',
      selected_ngo_id: IDS.ngoActive,
      chat_room_url: `/chats/${ITEM_IDS.basket}`,
    });
    expect(await fetchItem(ITEM_IDS.basket)).toMatchObject({ status: 'EM_PROGRESSO', selected_ngo_id: IDS.ngoActive });
    expect(await apiError(selectNgo(ITEM_IDS.basket, IDS.ngoActive2))).toMatchObject({ code: 'ITEM_NOT_AVAILABLE' });

    db.loginAs(IDS.donor2);
    expect(await apiError(selectNgo(ITEM_IDS.jeans, IDS.ngoActive2))).toMatchObject({ status: 403 });
  });
});
