import type { Category, ItemStatus, ModerationStatus } from '@/core/types/api';

/** Item como fica no "banco" falso (as rotas montam FeedItem, ItemDetail e PublicItem a partir dele). */
export interface MockItem {
  id: string;
  donor_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  category: Category;
  city: string;
  state: string;
  status: ItemStatus;
  selected_ngo_id: string | null;
  created_at: string;
  completed_at: string | null;
  photos: { id: string; photo_url: string }[];
  /** Moderação do anúncio (denúncias de conteúdo); fora de VISIVEL o item some do feed. */
  moderation_status: ModerationStatus;
  /** Motivo da remoção pelo Admin (só o doador vê). */
  moderation_reason: string | null;
}

const CATEGORY_COLORS: Record<Category, [string, string, string]> = {
  ROUPAS: ['#1d4ed8', '#2563eb', '#3b82f6'],
  BRINQUEDOS: ['#b45309', '#d97706', '#f59e0b'],
  ALIMENTOS: ['#15803d', '#16a34a', '#22c55e'],
  LIVROS: ['#7e22ce', '#9333ea', '#a855f7'],
};

const CATEGORY_GLYPH: Record<Category, string> = { ROUPAS: '👕', BRINQUEDOS: '🧸', ALIMENTOS: '🥫', LIVROS: '📚' };

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Foto falsa gerada na hora (SVG em data URL, decisão da fase 3): cor da categoria, um símbolo,
 * o título e "foto n/3". Sem internet e sem foto de terceiros.
 */
export function mockPhoto(title: string, category: Category, n: number): string {
  const color = CATEGORY_COLORS[category][(n - 1) % 3]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="${color}"/>
<circle cx="${180 + n * 140}" cy="${140 + n * 30}" r="${90 + n * 20}" fill="#fff" fill-opacity="0.12"/>
<text x="400" y="290" font-size="140" text-anchor="middle">${CATEGORY_GLYPH[category]}</text>
<text x="400" y="400" font-family="sans-serif" font-size="38" font-weight="700" fill="#fff" text-anchor="middle">${escapeXml(title)}</text>
<text x="400" y="450" font-family="sans-serif" font-size="26" fill="#fff" fill-opacity="0.8" text-anchor="middle">foto ${n}/3</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Banner falso 1500×500 (SVG em data URL), como as fotos: sem rede nem imagem de terceiros. */
export function mockBanner(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0057a8"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>
<rect width="1500" height="500" fill="url(#g)"/>
<circle cx="1250" cy="120" r="220" fill="#fff" fill-opacity="0.08"/><circle cx="200" cy="460" r="260" fill="#fff" fill-opacity="0.06"/>
<text x="750" y="290" font-size="120" text-anchor="middle">🤝 📦 💙</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const HOUR = 3600 * 1000;
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();

let seq = 0;
const nextId = () => `55555555-5555-4555-8555-${String(++seq).padStart(12, '0')}`;

export function makeItem(
  input: Omit<MockItem, 'id' | 'photos' | 'completed_at' | 'created_at' | 'moderation_status' | 'moderation_reason'> &
    Partial<Pick<MockItem, 'moderation_status' | 'moderation_reason'>> & { hoursAgo: number; id?: string },
): MockItem {
  const id = input.id ?? nextId();
  const { hoursAgo: h, ...rest } = input;
  return {
    moderation_status: 'VISIVEL',
    moderation_reason: null,
    ...rest,
    id,
    created_at: hoursAgo(h),
    completed_at: input.status === 'DOADO' ? hoursAgo(Math.max(0, h - 1)) : null,
    photos: [1, 2, 3].map((n) => ({ id: `${id}-foto-${n}`, photo_url: mockPhoto(input.title, input.category, n) })),
  };
}

/** Itens fixos: 3 cidades, as 4 categorias e os 3 status. IDs estáveis para os testes. */
export const ITEM_IDS = {
  jeans: '55555555-5555-4555-8555-000000000101',
  bike: '55555555-5555-4555-8555-000000000104',
  babyClothes: '55555555-5555-4555-8555-000000000107',
  basket: '55555555-5555-4555-8555-000000000105',
  milk: '55555555-5555-4555-8555-000000000109',
  stroller: '55555555-5555-4555-8555-000000000110',
  uniforms: '55555555-5555-4555-8555-000000000112',
  /** Anúncio do Carlos que saiu do ar sozinho com 3 denúncias (aguarda o Admin). */
  magazines: '55555555-5555-4555-8555-000000000113',
} as const;

export function seedItems(ids: {
  donor: string;
  donor2: string;
  donor3: string;
  ngoActive: string;
  ngoActive2: string;
  ngoRejected: string;
}) {
  seq = 200;
  const sp = { city: 'São Paulo', state: 'SP' };
  const items: MockItem[] = [
    makeItem({
      id: ITEM_IDS.jeans,
      donor_id: ids.donor,
      title: 'Calças jeans (adulto)',
      description: 'Lote com 6 calças jeans masculinas e femininas, tamanhos 38 a 44. Todas lavadas e em bom estado.',
      notes: 'Retirada em Bela Vista, de segunda a sexta depois das 18h.',
      category: 'ROUPAS',
      ...sp,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 2,
    }),
    makeItem({
      donor_id: ids.donor,
      title: 'Casaco infantil tamanho 6',
      description: 'Pouco usado, forrado, ideal para o inverno.',
      notes: null,
      category: 'ROUPAS',
      ...sp,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 5,
    }),
    makeItem({
      donor_id: ids.donor,
      title: 'Kit de livros didáticos 5º ano',
      description: 'Português, matemática e ciências, sem rasuras.',
      notes: null,
      category: 'LIVROS',
      ...sp,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 9,
    }),
    makeItem({
      id: ITEM_IDS.bike,
      donor_id: ids.donor,
      title: 'Bicicleta aro 20',
      description: 'Pneus novos, precisa só de ajuste no freio.',
      notes: 'Posso levar até a ONG se for na zona central.',
      category: 'BRINQUEDOS',
      ...sp,
      status: 'EM_PROGRESSO',
      selected_ngo_id: ids.ngoActive,
      hoursAgo: 20,
    }),
    makeItem({
      id: ITEM_IDS.basket,
      donor_id: ids.donor,
      title: 'Cesta básica fechada',
      description: 'Arroz, feijão, óleo, açúcar e café. Validade até 2027.',
      notes: null,
      category: 'ALIMENTOS',
      ...sp,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 26,
    }),
    makeItem({
      donor_id: ids.donor,
      title: 'Jogos de tabuleiro',
      description: 'Três jogos completos, caixas um pouco gastas.',
      notes: null,
      category: 'BRINQUEDOS',
      ...sp,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 30,
    }),
    makeItem({
      id: ITEM_IDS.babyClothes,
      donor_id: ids.donor,
      title: 'Lote de roupas de bebê',
      description: 'Bodies e macacões de 0 a 6 meses.',
      notes: null,
      category: 'ROUPAS',
      ...sp,
      status: 'DOADO',
      selected_ngo_id: ids.ngoActive,
      hoursAgo: 72,
    }),
    makeItem({
      donor_id: ids.donor,
      title: 'Coleção de gibis',
      description: '40 gibis da Turma da Mônica, de 2010 a 2015.',
      notes: null,
      category: 'LIVROS',
      ...sp,
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 40,
    }),
    makeItem({
      id: ITEM_IDS.milk,
      donor_id: ids.donor,
      title: 'Leite em pó (6 latas)',
      description: 'Latas fechadas, validade em 8 meses.',
      notes: null,
      category: 'ALIMENTOS',
      ...sp,
      status: 'EM_PROGRESSO',
      selected_ngo_id: ids.ngoActive2,
      hoursAgo: 48,
    }),
    makeItem({
      id: ITEM_IDS.stroller,
      donor_id: ids.donor2,
      title: 'Carrinho de bebê',
      description: 'Dobrável, com capota. Uma roda range um pouco.',
      notes: null,
      category: 'BRINQUEDOS',
      city: 'Campinas',
      state: 'SP',
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 3,
    }),
    makeItem({
      id: ITEM_IDS.magazines,
      donor_id: ids.donor2,
      title: 'Revistas antigas',
      description: 'Caixa com revistas dos anos 90.',
      notes: null,
      category: 'LIVROS',
      city: 'Campinas',
      state: 'SP',
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 8,
      moderation_status: 'OCULTO',
    }),
    makeItem({
      donor_id: ids.donor2,
      title: 'Livros de receitas',
      description: 'Cinco livros de culinária brasileira.',
      notes: null,
      category: 'LIVROS',
      city: 'Campinas',
      state: 'SP',
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 15,
    }),
    makeItem({
      id: ITEM_IDS.uniforms,
      donor_id: ids.donor3,
      title: 'Uniformes escolares',
      description: 'Camisetas e bermudas do tamanho 10 ao 14.',
      notes: null,
      category: 'ROUPAS',
      city: 'Rio de Janeiro',
      state: 'RJ',
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 1,
    }),
    makeItem({
      donor_id: ids.donor3,
      title: 'Arroz e feijão (10 kg)',
      description: 'Pacotes fechados.',
      notes: null,
      category: 'ALIMENTOS',
      city: 'Rio de Janeiro',
      state: 'RJ',
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 12,
    }),
    makeItem({
      donor_id: ids.donor3,
      title: 'Patinete',
      description: 'Rodas de silicone, aguenta até 50 kg.',
      notes: null,
      category: 'BRINQUEDOS',
      city: 'Rio de Janeiro',
      state: 'RJ',
      status: 'DISPONIVEL',
      selected_ngo_id: null,
      hoursAgo: 60,
    }),
  ];
  const interests = new Map<string, string>([
    // chave `${itemId}:${ngoId}` → quando curtiu
    [`${ITEM_IDS.jeans}:${ids.ngoActive2}`, hoursAgo(1)],
    [`${ITEM_IDS.bike}:${ids.ngoActive}`, hoursAgo(19)],
    [`${ITEM_IDS.babyClothes}:${ids.ngoActive}`, hoursAgo(71)],
    [`${ITEM_IDS.milk}:${ids.ngoActive2}`, hoursAgo(47)],
    // Cesta: duas ONGs ativas e uma que deixou de estar ativa depois de curtir (aparece sem "Escolher").
    [`${ITEM_IDS.basket}:${ids.ngoActive2}`, hoursAgo(20)],
    [`${ITEM_IDS.basket}:${ids.ngoRejected}`, hoursAgo(10)],
    [`${ITEM_IDS.basket}:${ids.ngoActive}`, hoursAgo(4)],
  ]);
  return { items: new Map(items.map((i) => [i.id, i])), interests };
}
