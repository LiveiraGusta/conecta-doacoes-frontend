// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/core/api/http';
import { selectNgo } from '@/core/services/items';
import { fetchAdminNgos, fetchReport, fetchReports, resolveReport, setNgoStatus } from '@/core/services/admin';
import { REPORT_IDS } from '../chats';
import { db, IDS } from '../db';
import { ITEM_IDS } from '../items';

const fail = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (e: ApiError) => e,
  );
const pendingProfileId = () => db.state.users.get(IDS.ngoPending)!.user.ngo_profile!.id;

/** Mocks da moderação seguindo o openapi.yaml: só Admin, filas, aprovar/rejeitar, denúncias e resolver. */
describe('mocks do admin', () => {
  it('só o Admin entra', async () => {
    db.loginAs(IDS.donor);
    expect(await fail(fetchAdminNgos('PENDENTE_APROVACAO', 0))).toMatchObject({ status: 403 });
    expect(await fail(fetchReports('ABERTA', 'CHAT', 0))).toMatchObject({ status: 403 });
  });

  it('fila de ONGs por status, com documento e data de cadastro', async () => {
    db.loginAs(IDS.admin);
    const pending = await fetchAdminNgos('PENDENTE_APROVACAO', 0);
    expect(pending.data.map((n) => n.name)).toEqual(['Instituto Novo Começo']);
    expect(pending.data[0]).toMatchObject({ status: 'PENDENTE_APROVACAO', cnpj: '45.997.418/0001-53' });
    expect(pending.data[0]?.document_url).toMatch(/^data:image\/svg\+xml/);
    expect((await fetchAdminNgos('ATIVO', 0)).total).toBe(2);
    expect((await fetchAdminNgos('REJEITADO', 0)).data[0]?.rejection_reason).toMatch(/ilegível/);
  });

  it('aprovar e rejeitar (motivo de 10 a 1000)', async () => {
    db.loginAs(IDS.admin);
    expect(await fail(setNgoStatus(pendingProfileId(), 'REJEITADO', 'curto'))).toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(await setNgoStatus(pendingProfileId(), 'REJEITADO', 'O CNPJ não confere com o cadastro.')).toMatchObject({
      status: 'REJEITADO',
      rejection_reason: 'O CNPJ não confere com o cadastro.',
    });
    expect(await setNgoStatus(pendingProfileId(), 'ATIVO')).toMatchObject({ status: 'ATIVO', rejection_reason: null });
    expect(db.state.users.get(IDS.ngoPending)!.user.ngo_profile!.status).toBe('ATIVO');
    expect(await fail(setNgoStatus('00000000-0000-4000-8000-000000000000', 'ATIVO'))).toMatchObject({
      code: 'NGO_NOT_FOUND',
    });
  });

  it('denúncias: fila por status, detalhe com partes, eventos e mensagens; resolver é idempotente', async () => {
    db.loginAs(IDS.admin);
    const open = await fetchReports('ABERTA', 'CHAT', 0);
    expect(open.data.map((r) => r.id)).toEqual([REPORT_IDS.open]);
    expect(open.data[0]).toMatchObject({
      item: { id: ITEM_IDS.milk },
      reporter: { name: 'Marina Souza', role: 'DONOR' },
      reported: { name: 'Casa do Bem', role: 'NGO' },
    });

    const detail = await fetchReport(REPORT_IDS.open);
    expect(detail.reported).toMatchObject({ email: 'casadobem@demo.conectadoacoes.local' });
    expect(detail.reported?.ngo_profile_id).toBeTruthy();
    expect(detail.events?.map((e) => e.to_status)).toEqual(['DISPONIVEL', 'EM_PROGRESSO']);
    expect(detail.messages?.some((m) => m.message.includes('Pix'))).toBe(true);

    expect(await resolveReport(REPORT_IDS.open)).toMatchObject({ status: 'RESOLVIDA' });
    expect(await resolveReport(REPORT_IDS.open)).toMatchObject({ status: 'RESOLVIDA' });
    expect((await fetchReports('ABERTA', 'CHAT', 0)).total).toBe(0);
    expect(await fail(fetchReport('00000000-0000-4000-8000-000000000000'))).toMatchObject({
      code: 'REPORT_NOT_FOUND',
    });
  });

  it('as transições viram eventos (escolher ONG registra quem escolheu)', async () => {
    db.loginAs(IDS.donor);
    await selectNgo(ITEM_IDS.basket, IDS.ngoActive);
    const last = db.state.events.filter((e) => e.item_id === ITEM_IDS.basket).at(-1);
    expect(last).toMatchObject({ from_status: 'DISPONIVEL', to_status: 'EM_PROGRESSO', actor_id: IDS.donor });
  });
});
