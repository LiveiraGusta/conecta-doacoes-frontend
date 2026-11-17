// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addInterest,
  fetchFeed,
  fetchItem,
  fetchPublicFeed,
  fetchPublicItem,
  removeInterest,
} from '@/core/services/items';
import { updateProfile } from '@/core/services/profile';
import { db, IDS } from '../db';
import { ITEM_IDS, makeItem } from '../items';
import { abbreviateName } from './items';

/** Os mocks de itens seguem o contrato (openapi.yaml): feed por cidade, visitante sem dados de pessoas, regras do interesse. */
describe('mocks de itens e interesse', () => {
  it('abrevia o nome como a API', () => {
    expect(abbreviateName('Marina Souza')).toBe('Marina S.');
    expect(abbreviateName('Ana Maria da Silva')).toBe('Ana S.');
    expect(abbreviateName('Admin')).toBe('Admin');
  });

  it('feed logado: só a cidade de quem vê, sem itens doados, do mais novo ao mais antigo', async () => {
    db.loginAs(IDS.donor);
    const feed = await fetchFeed({}, 0);
    expect(feed.total).toBe(8);
    expect(feed.data.every((i) => i.city === 'São Paulo' && i.status !== 'DOADO')).toBe(true);
    expect(feed.data[0]).toMatchObject({ id: ITEM_IDS.jeans, donor: { name: 'Marina S.' } });
    const dates = feed.data.map((i) => i.created_at!);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('feed logado filtra por categoria e busca (título ou descrição, sem diferenciar maiúsculas)', async () => {
    db.loginAs(IDS.donor);
    expect((await fetchFeed({ category: 'LIVROS' }, 0)).total).toBe(2);
    expect((await fetchFeed({ search: 'JEANS' }, 0)).data.map((i) => i.id)).toEqual([ITEM_IDS.jeans]);
    expect((await fetchFeed({ search: 'validade' }, 0)).total).toBe(2);
  });

  it('feed pagina por limit/offset mantendo o total', async () => {
    db.loginAs(IDS.donor);
    for (let i = 0; i < 10; i++) {
      const item = makeItem({
        donor_id: IDS.donor,
        title: `Extra ${i}`,
        description: null,
        notes: null,
        category: 'ROUPAS',
        city: 'São Paulo',
        state: 'SP',
        status: 'DISPONIVEL',
        selected_ngo_id: null,
        hoursAgo: 100 + i,
      });
      db.state.items.set(item.id, item);
    }
    const first = await fetchFeed({}, 0);
    const second = await fetchFeed({}, 12);
    expect(first).toMatchObject({ total: 18 });
    expect(first.data).toHaveLength(12);
    expect(second.data).toHaveLength(6);
  });

  it('feed logado exige sessão; Admin não tem feed', async () => {
    await expect(fetchFeed({}, 0)).rejects.toMatchObject({ status: 401 });
    db.loginAs(IDS.admin);
    await expect(fetchFeed({}, 0)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('visitante: todas as cidades, sem doador nem contexto, e o detalhe sem observações', async () => {
    const feed = await fetchPublicFeed({}, 0);
    expect(feed.total).toBe(13);
    expect(new Set(feed.data.map((i) => i.city))).toEqual(new Set(['São Paulo', 'Campinas', 'Rio de Janeiro']));
    for (const item of feed.data) {
      expect(Object.keys(item).sort()).toEqual(
        ['category', 'city', 'created_at', 'description', 'id', 'photos', 'state', 'status', 'title'].sort(),
      );
    }
    const detail = await fetchPublicItem(ITEM_IDS.jeans);
    expect(detail).not.toHaveProperty('notes');
    expect(detail).not.toHaveProperty('donor');
    await expect(fetchPublicItem(ITEM_IDS.babyClothes)).rejects.toMatchObject({ status: 404, code: 'ITEM_NOT_FOUND' });
  });

  it('detalhe logado traz observações, fotos com id e o contexto de quem vê', async () => {
    db.loginAs(IDS.ngoActive);
    const bike = await fetchItem(ITEM_IDS.bike);
    expect(bike).toMatchObject({ notes: expect.any(String), is_selected: true, donor_id: IDS.donor });
    expect(bike.photos[0]).toMatchObject({
      id: expect.any(String),
      photo_url: expect.stringMatching(/^data:image\/svg/),
    });
    db.loginAs(IDS.ngoActive2);
    expect((await fetchItem(ITEM_IDS.bike)).is_selected).toBe(false);
  });

  it('interesse: ONG ativa curte e desfaz; repetir dá ALREADY_INTERESTED / INTEREST_NOT_FOUND', async () => {
    db.loginAs(IDS.ngoActive);
    await addInterest(ITEM_IDS.jeans);
    expect((await fetchItem(ITEM_IDS.jeans)).has_user_interest).toBe(true);
    await expect(addInterest(ITEM_IDS.jeans)).rejects.toMatchObject({ status: 409, code: 'ALREADY_INTERESTED' });
    await removeInterest(ITEM_IDS.jeans);
    await expect(removeInterest(ITEM_IDS.jeans)).rejects.toMatchObject({ status: 404, code: 'INTEREST_NOT_FOUND' });
  });

  it('interesse: regras de quem pode e de qual item', async () => {
    db.loginAs(IDS.donor);
    await expect(addInterest(ITEM_IDS.jeans)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    db.loginAs(IDS.ngoPending);
    await expect(addInterest(ITEM_IDS.jeans)).rejects.toMatchObject({ status: 403, code: 'NGO_NOT_APPROVED' });
    db.loginAs(IDS.ngoActive);
    await expect(addInterest(ITEM_IDS.stroller)).rejects.toMatchObject({ status: 403, code: 'OUT_OF_REGION' });
    await expect(addInterest(ITEM_IDS.milk)).rejects.toMatchObject({ status: 409, code: 'ITEM_NOT_AVAILABLE' });
  });

  it('interesse: a ONG escolhida não pode desfazer (ALREADY_SELECTED)', async () => {
    db.loginAs(IDS.ngoActive);
    db.state.interests.set(`${ITEM_IDS.bike}:${IDS.ngoActive}`, new Date().toISOString());
    await expect(removeInterest(ITEM_IDS.bike)).rejects.toMatchObject({ status: 409, code: 'ALREADY_SELECTED' });
  });

  it('PATCH /profile troca a cidade e o feed acompanha; cidade sem UF é erro de validação', async () => {
    db.loginAs(IDS.donor);
    const user = await updateProfile({ city: 'Campinas', state: 'SP' });
    expect(user).toMatchObject({ city: 'Campinas', state: 'SP' });
    expect((await fetchFeed({}, 0)).total).toBe(2);
    await expect(updateProfile({ city: 'Santos' })).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  });
});
