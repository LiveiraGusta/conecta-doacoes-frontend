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

/**
 * Desenho de cada categoria nas fotos falsas: o `d` do mesmo ícone Material da barra de categorias
 * (features/feed/categories.ts), copiado de @mui/icons-material. Ícones da interface só do Material, nunca emoji.
 */
const CATEGORY_ICON_PATH: Record<Category, string> = {
  ROUPAS:
    'M21.6 18.2 13 11.75v-.91c1.65-.49 2.8-2.17 2.43-4.05-.26-1.31-1.3-2.4-2.61-2.7-1.76-.4-3.37.53-4.02 1.98-.3.67.18 1.43.91 1.43.39 0 .75-.22.9-.57.23-.55.76-.93 1.39-.93.83 0 1.5.67 1.5 1.5 0 .84-.69 1.52-1.53 1.5-.54-.01-.97.45-.97.99v1.76L2.4 18.2c-.77.58-.36 1.8.6 1.8h18c.96 0 1.37-1.22.6-1.8M6 18l6-4.5 6 4.5z', // CheckroomRounded
  ALIMENTOS:
    'M16 6v6c0 1.1.9 2 2 2h1v7c0 .55.45 1 1 1s1-.45 1-1V3.13c0-.65-.61-1.13-1.24-.98C17.6 2.68 16 4.51 16 6m-5 3H9V3c0-.55-.45-1-1-1s-1 .45-1 1v6H5V3c0-.55-.45-1-1-1s-1 .45-1 1v6c0 2.21 1.79 4 4 4v8c0 .55.45 1 1 1s1-.45 1-1v-8c2.21 0 4-1.79 4-4V3c0-.55-.45-1-1-1s-1 .45-1 1z', // RestaurantRounded
  BRINQUEDOS:
    'm21.58 16.09-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91M11 11H9v2H8v-2H6v-1h2V8h1v2h2zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1', // SportsEsportsRounded
  LIVROS:
    'M17.5 4.5c-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5-1.45 0-2.99.22-4.28.79C1.49 5.62 1 6.33 1 7.14v11.28c0 1.3 1.22 2.26 2.48 1.94.98-.25 2.02-.36 3.02-.36 1.56 0 3.22.26 4.56.92.6.3 1.28.3 1.87 0 1.34-.67 3-.92 4.56-.92 1 0 2.04.11 3.02.36 1.26.33 2.48-.63 2.48-1.94V7.14c0-.81-.49-1.52-1.22-1.85-1.28-.57-2.82-.79-4.27-.79M21 17.23c0 .63-.58 1.09-1.2.98-.75-.14-1.53-.2-2.3-.2-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5.92 0 1.83.09 2.7.28.46.1.8.51.8.98z M13.98 11.01c-.32 0-.61-.2-.71-.52-.13-.39.09-.82.48-.94 1.54-.5 3.53-.66 5.36-.45.41.05.71.42.66.83s-.42.71-.83.66c-1.62-.19-3.39-.04-4.73.39-.08.01-.16.03-.23.03m0 2.66c-.32 0-.61-.2-.71-.52-.13-.39.09-.82.48-.94 1.53-.5 3.53-.66 5.36-.45.41.05.71.42.66.83s-.42.71-.83.66c-1.62-.19-3.39-.04-4.73.39-.08.02-.16.03-.23.03m0 2.66c-.32 0-.61-.2-.71-.52-.13-.39.09-.82.48-.94 1.53-.5 3.53-.66 5.36-.45.41.05.71.42.66.83s-.42.7-.83.66c-1.62-.19-3.39-.04-4.73.39-.08.02-.16.03-.23.03', // MenuBookRounded
};

/** Ícones do banner falso (VolunteerActivismRounded, Inventory2Rounded, FavoriteRounded). */
const BANNER_ICON_PATHS = [
  'M3 11c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2s2-.9 2-2v-7c0-1.1-.9-2-2-2m7-5.7C10 3.45 11.45 2 13.3 2c1.04 0 2.05.49 2.7 1.25.65-.76 1.66-1.25 2.7-1.25C20.55 2 22 3.45 22 5.3c0 2.1-2.5 4.51-5.33 7.09-.38.35-.97.35-1.35 0C12.5 9.81 10 7.4 10 5.3M19.99 17h-6.83a.96.96 0 0 1-.33-.06l-1.47-.51c-.26-.09-.39-.37-.3-.63s.38-.4.64-.3l1.12.43c.11.04.24.07.36.07h2.63c.65 0 1.18-.53 1.18-1.18 0-.49-.31-.93-.77-1.11L9.3 11.13c-.22-.09-.46-.13-.7-.13H7v9.02l6.37 1.81c.41.12.85.1 1.25-.05L22 19c0-1.11-.9-2-2.01-2',
  'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2m-6 12h-4c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1m6-7H4V4h16z',
  'M13.35 20.13c-.76.69-1.93.69-2.69-.01l-.11-.1C5.3 15.27 1.87 12.16 2 8.28c.06-1.7.93-3.33 2.34-4.29 2.64-1.8 5.9-.96 7.66 1.1 1.76-2.06 5.02-2.91 7.66-1.1 1.41.96 2.28 2.59 2.34 4.29.14 3.88-3.3 6.99-8.55 11.76z',
];

/** Ícone Material (viewBox 24×24) desenhado em branco, centrado em (cx, cy) com o tamanho pedido. */
const svgIcon = (d: string, cx: number, cy: number, size: number) =>
  `<path transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 24})" fill="#fff" d="${d}"/>`;

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Foto falsa gerada na hora (SVG em data URL, decisão da fase 3): cor da categoria, o ícone dela,
 * o título e "foto n/3". Sem internet e sem foto de terceiros.
 */
export function mockPhoto(title: string, category: Category, n: number): string {
  const color = CATEGORY_COLORS[category][(n - 1) % 3]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<rect width="800" height="600" fill="${color}"/>
<circle cx="${180 + n * 140}" cy="${140 + n * 30}" r="${90 + n * 20}" fill="#fff" fill-opacity="0.12"/>
${svgIcon(CATEGORY_ICON_PATH[category], 400, 230, 150)}
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
${BANNER_ICON_PATHS.map((d, i) => svgIcon(d, 570 + i * 180, 250, 120)).join('')}
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
