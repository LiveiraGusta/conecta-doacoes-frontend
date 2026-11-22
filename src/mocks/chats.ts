import type { Message, ReportCategory, ReportKind, ReportResolution } from '@/core/types/api';
import { ITEM_IDS } from './items';

/** Denúncia como fica no "banco" falso (a fila do Admin chega na fase 7). */
export interface MockReport {
  id: string;
  item_id: string;
  reporter_id: string;
  reported_id: string;
  /** CHAT: a outra parte da negociação. ITEM: o conteúdo do anúncio. */
  kind: ReportKind;
  category: ReportCategory | null;
  reason: string | null;
  status: 'ABERTA' | 'RESOLVIDA';
  resolution: ReportResolution;
  created_at: string;
}

const MINUTE = 60 * 1000;
const minutesAgo = (m: number) => new Date(Date.now() - m * MINUTE).toISOString();

let seq = 0;
/** IDs fixos das denúncias do seed. */
export const REPORT_IDS = {
  open: '77777777-7777-4777-8777-000000000001',
  resolved: '77777777-7777-4777-8777-000000000002',
  /** Primeira das 3 denúncias de anúncio das "Revistas antigas". */
  itemOpen: '77777777-7777-4777-8777-000000000003',
} as const;

const nextId = () => `66666666-6666-4666-8666-${String(++seq).padStart(12, '0')}`;

function msg(itemId: string, from: string, to: string, text: string, ago: number): Message {
  return {
    id: nextId(),
    item_id: itemId,
    sender_id: from,
    receiver_id: to,
    message: text,
    created_at: minutesAgo(ago),
  };
}

/**
 * Conversas do seed (fase 5):
 * - bicicleta: Marina ↔ ONG Salvadora, em negociação, 2 mensagens da ONG ainda não lidas pela Marina;
 * - leite em pó: Marina ↔ Casa do Bem, em negociação, tudo lido;
 * - roupas de bebê: Marina ↔ ONG Salvadora, doada (só leitura).
 */
export function seedChats(ids: { donor: string; donor2: string; ngoActive: string; ngoActive2: string }) {
  seq = 0;
  const { donor, donor2, ngoActive: ngo, ngoActive2: ngo2 } = ids;
  const messages: Message[] = [
    msg(ITEM_IDS.bike, donor, ngo, 'Oi! Que bom que a bicicleta vai para vocês.', 600),
    msg(ITEM_IDS.bike, ngo, donor, 'Oi, Marina! Muito obrigado. Temos uma criança que vai adorar.', 590),
    msg(ITEM_IDS.bike, donor, ngo, 'Posso levar até aí no sábado de manhã. Funciona?', 120),
    msg(ITEM_IDS.bike, ngo, donor, 'Funciona sim! Estamos abertos das 9h às 13h.', 30),
    msg(ITEM_IDS.bike, ngo, donor, 'O endereço é Av. Paulista, 1000, sala 12.', 29),
    msg(ITEM_IDS.milk, donor, ngo2, 'Olá! As latas estão separadas.', 2000),
    msg(ITEM_IDS.milk, ngo2, donor, 'Perfeito, passamos para buscar na quinta.', 1900),
    msg(ITEM_IDS.milk, ngo2, donor, 'Só precisamos de R$ 30 para o combustível, pode mandar por Pix?', 1850),
    msg(ITEM_IDS.babyClothes, donor, ngo, 'As roupas estão lavadas e dobradas.', 4400),
    msg(ITEM_IDS.babyClothes, ngo, donor, 'Recebemos tudo! Muito obrigado.', 4330),
  ];
  // Última leitura de cada um (`${itemId}:${userId}`): a Marina leu a bicicleta antes das 2 últimas.
  const reads = new Map<string, string>([
    [`${ITEM_IDS.bike}:${donor}`, minutesAgo(100)],
    [`${ITEM_IDS.bike}:${ngo}`, minutesAgo(29)],
    [`${ITEM_IDS.milk}:${donor}`, minutesAgo(1800)],
    [`${ITEM_IDS.milk}:${ngo2}`, minutesAgo(1900)],
    [`${ITEM_IDS.babyClothes}:${donor}`, minutesAgo(4300)],
    [`${ITEM_IDS.babyClothes}:${ngo}`, minutesAgo(4330)],
  ]);
  // Denúncias para a fila do Admin: de negociação, uma aberta (doadora → Casa do Bem) e uma resolvida;
  // de anúncio, 3 abertas contra as "Revistas antigas" do Carlos (por isso o anúncio está OCULTO).
  const chat = { kind: 'CHAT' as const, category: null, resolution: null };
  const itemReport = (n: number, reporter: string, category: ReportCategory, reason: string | null, ago: number) => ({
    id: `77777777-7777-4777-8777-00000000000${n}`,
    item_id: ITEM_IDS.magazines,
    reporter_id: reporter,
    reported_id: donor2,
    kind: 'ITEM' as const,
    category,
    reason,
    status: 'ABERTA' as const,
    resolution: null,
    created_at: minutesAgo(ago),
  });
  const reports = new Map<string, MockReport>(
    [
      itemReport(3, ngo, 'NUDEZ', 'A terceira foto mostra uma capa com nudez.', 300),
      itemReport(4, donor, 'NUDEZ', null, 200),
      itemReport(5, ngo2, 'OUTRO', 'Parece propaganda de uma loja, não uma doação.', 100),
      {
        id: '77777777-7777-4777-8777-000000000001',
        item_id: ITEM_IDS.milk,
        reporter_id: donor,
        reported_id: ngo2,
        reason: 'Pediram dinheiro por Pix para buscar a doação. Achei estranho.',
        ...chat,
        status: 'ABERTA' as const,
        created_at: minutesAgo(1840),
      },
      {
        id: '77777777-7777-4777-8777-000000000002',
        item_id: ITEM_IDS.babyClothes,
        reporter_id: ngo,
        reported_id: donor,
        reason: 'Marcou a entrega e não apareceu no primeiro dia combinado.',
        ...chat,
        status: 'RESOLVIDA' as const,
        created_at: minutesAgo(4350),
      },
    ].map((r) => [r.id, r]),
  );
  return { messages, reads, reports };
}

/** Respostas automáticas da outra parte no `dev:mock` (para ver o tempo real funcionando). */
export const AUTO_REPLIES = [
  'Combinado!',
  'Perfeito, obrigado pelo aviso.',
  'Pode ser. Te aviso quando estiver saindo.',
  'Ótimo, até lá!',
];
