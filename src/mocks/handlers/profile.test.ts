// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/core/api/http';
import {
  changePassword,
  deleteAccount,
  fetchPublicUser,
  fetchUserDonations,
  fetchUserProfile,
  removeAvatar,
  resubmitDocument,
  updatePreferences,
  updateProfile,
  uploadAvatar,
  uploadBanner,
} from '@/core/services/profile';
import { lookupCep } from '@/core/services/viacep';
import { db, IDS, MOCK_PASSWORD } from '../db';
import { ITEM_IDS } from '../items';

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: ApiError) => e,
  );
const image = (type = 'image/webp', size = 10) => new File([new Uint8Array(size)], 'img.webp', { type });

/** Mocks da fase 6 (perfil, imagens, preferências, senha, conta, documento, página pessoal, ViaCEP). */
describe('mocks do perfil', () => {
  it('PATCH /profile: só o que vem muda; null apaga; campos de ONG são recusados para doador', async () => {
    db.loginAs(IDS.ngoActive);
    const user = await updateProfile({
      bio: 'Nova descrição',
      phone: '(21) 3456-7890',
      instagram: 'https://instagram.com/nova.ong',
      accepted_categories: ['LIVROS', 'LIVROS', 'ROUPAS'],
      address: { cep: '01001-000', street: 'Praça da Sé', number: '1', neighborhood: 'Sé' },
    });
    expect(user.bio).toBe('Nova descrição');
    expect(user.ngo_profile).toMatchObject({
      phone: '2134567890',
      instagram: 'nova.ong',
      accepted_categories: ['LIVROS', 'ROUPAS'],
      address: { cep: '01001000', street: 'Praça da Sé', complement: null },
    });
    expect((await updateProfile({ address: null, website: null })).ngo_profile).toMatchObject({
      address: null,
      website: null,
    });
    const bad = await fail(updateProfile({ phone: '123', instagram: 'com espaço' }));
    expect(bad?.details?.map((d) => d.path)).toEqual(['phone', 'instagram']);

    db.loginAs(IDS.donor);
    const donor = await fail(updateProfile({ bio: 'oi', phone: '11987654321' }));
    expect(donor).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(donor?.details?.[0]?.path).toBe('phone');
    expect(await fail(updateProfile({ city: 'Campinas' }))).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('foto de perfil e banner: tipo e tamanho; banner só de ONG', async () => {
    db.loginAs(IDS.donor);
    expect((await uploadAvatar(image())).avatar_url).toBeTruthy();
    expect((await removeAvatar()).avatar_url).toBeNull();
    expect(await fail(uploadAvatar(image('image/gif')))).toMatchObject({ code: 'INVALID_PHOTO' });
    expect(await fail(uploadAvatar(image('image/png', 6 * 1024 * 1024)))).toMatchObject({ status: 413 });
    expect(await fail(uploadBanner(image()))).toMatchObject({ status: 403 });
    db.loginAs(IDS.ngoActive);
    expect((await uploadBanner(image())).ngo_profile?.banner_url).toBeTruthy();
  });

  it('preferências: parcial; mostrar doações só para doador', async () => {
    db.loginAs(IDS.ngoActive);
    expect(await updatePreferences({ theme_color: 'ROXO' })).toMatchObject({
      theme_color: 'ROXO',
      theme_mode: 'SYSTEM',
    });
    expect(await fail(updatePreferences({ show_donations: true }))).toMatchObject({ code: 'VALIDATION_ERROR' });
    db.loginAs(IDS.donor);
    expect(await updatePreferences({ show_donations: false })).toMatchObject({ show_donations: false });
  });

  it('senha: confere a atual, recusa repetir e aplica a regra', async () => {
    db.loginAs(IDS.donor);
    expect(await fail(changePassword('errada', 'Nova12345'))).toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
    expect(await fail(changePassword(MOCK_PASSWORD, MOCK_PASSWORD))).toMatchObject({ code: 'SAME_PASSWORD' });
    expect(await fail(changePassword(MOCK_PASSWORD, 'curta'))).toMatchObject({ code: 'VALIDATION_ERROR' });
    await changePassword(MOCK_PASSWORD, 'Nova12345');
    expect(db.state.users.get(IDS.donor)?.password).toBe('Nova12345');
  });

  it('excluir conta: senha certa e sem negociação em andamento', async () => {
    db.loginAs(IDS.donor);
    expect(await fail(deleteAccount('errada'))).toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
    expect(await fail(deleteAccount(MOCK_PASSWORD))).toMatchObject({ status: 409, code: 'HAS_ACTIVE_NEGOTIATIONS' });
    db.loginAs(IDS.donor2);
    await deleteAccount(MOCK_PASSWORD);
    expect(db.state.users.has(IDS.donor2)).toBe(false);
    expect(db.sessionUser()).toBeNull();
  });

  it('documento da ONG: rejeitada volta para análise; aprovada não reenvia', async () => {
    const pdf = new File(['%PDF'], 'cartao.pdf', { type: 'application/pdf' });
    db.loginAs(IDS.ngoRejected);
    expect(await fail(resubmitDocument(image('image/gif')))).toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect((await resubmitDocument(pdf)).ngo_profile).toMatchObject({
      status: 'PENDENTE_APROVACAO',
      rejection_reason: null,
    });
    db.loginAs(IDS.ngoActive);
    expect(await fail(resubmitDocument(pdf))).toMatchObject({ code: 'NGO_ALREADY_ACTIVE' });
  });

  it('página pessoal: doador abreviado e doações ocultas; ONG sem contatos enquanto não aprovada', async () => {
    db.loginAs(IDS.ngoActive);
    expect(await fetchUserProfile(IDS.donor)).toMatchObject({ name: 'Marina S.', donations_count: 1, ngo: null });
    expect((await fetchUserDonations(IDS.donor, 0)).data.map((i) => i.id)).toEqual([ITEM_IDS.babyClothes]);

    db.state.users.get(IDS.donor)!.user.preferences.show_donations = false;
    expect(await fetchUserProfile(IDS.donor)).toMatchObject({ donations_count: null });
    expect(await fetchUserDonations(IDS.donor, 0)).toEqual({ total: 0, data: [], hidden: true });
    db.loginAs(IDS.donor);
    expect((await fetchUserProfile(IDS.donor)).donations_count).toBe(1);
    expect((await fetchUserDonations(IDS.donor, 0)).hidden).toBe(false);

    const ngo = await fetchUserProfile(IDS.ngoActive);
    expect(ngo.ngo).toMatchObject({ status: 'ATIVO', phone: '11987654321', instagram: 'ongsalvadora' });
    expect(ngo.donations_count).toBe(1);
    db.state.users.get(IDS.ngoPending)!.user.ngo_profile!.phone = '11999999999';
    expect((await fetchUserProfile(IDS.ngoPending)).ngo).toMatchObject({ phone: null, address: null });
    expect(await fail(fetchUserProfile(IDS.admin))).toMatchObject({ status: 404, code: 'USER_NOT_FOUND' });
  });

  it('versão pública: sem nome nem contatos; ONG não aprovada e Admin não existem', async () => {
    const pub = await fetchPublicUser(IDS.ngoActive);
    expect(Object.keys(pub).sort()).toEqual(
      ['accepted_categories', 'bio', 'city', 'donations_count', 'id', 'role', 'state'].sort(),
    );
    expect(await fail(fetchPublicUser(IDS.ngoPending))).toMatchObject({ status: 404 });
    expect(await fail(fetchPublicUser(IDS.admin))).toMatchObject({ status: 404 });
  });

  it('ViaCEP: conhecido preenche; desconhecido ou inválido devolve null', async () => {
    expect(await lookupCep('01310-100')).toEqual({
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(await lookupCep('99999999')).toBeNull();
    expect(await lookupCep('123')).toBeNull();
  });
});
