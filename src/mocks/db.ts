import type { Preferences, User } from '@/core/types/api';
import type { Message } from '@/core/types/api';
import { seedChats, type MockReport } from './chats';
import { mockBanner, seedItems, type MockItem } from './items';

/**
 * "Banco" em memória dos dados falsos (MSW), com IDs fixos para testes e para o seletor "Entrar como".
 * Uma única sessão (o navegador do dev:mock ou o teste em execução): `sessionUserId`.
 * Cada fase acrescenta aqui as tabelas do seu domínio (itens, interesses, chats…).
 */

export const MOCK_PASSWORD = 'Demo1234';

export const IDS = {
  donor: '11111111-1111-4111-8111-111111111111',
  donor2: '11111111-1111-4111-8111-111111111112',
  donor3: '11111111-1111-4111-8111-111111111113',
  ngoActive: '22222222-2222-4222-8222-222222222221',
  ngoActive2: '22222222-2222-4222-8222-222222222224',
  ngoPending: '22222222-2222-4222-8222-222222222222',
  ngoRejected: '22222222-2222-4222-8222-222222222223',
  admin: '33333333-3333-4333-8333-333333333331',
} as const;

export interface MockUser {
  user: User;
  password: string;
}

export interface MockState {
  users: Map<string, MockUser>;
  sessionUserId: string | null;
  items: Map<string, MockItem>;
  /** Interesses (curtidas): chave `${itemId}:${ngoId}` → quando curtiu (ISO). */
  interests: Map<string, string>;
  /** Mensagens de todas as salas (o par atual é filtrado por quem envia e recebe). */
  messages: Message[];
  /** Última leitura: `${itemId}:${userId}` → ISO. */
  reads: Map<string, string>;
  reports: Map<string, MockReport>;
  /** Transições de status dos itens (a tabela item_events da API), para o detalhe da denúncia. */
  events: MockEvent[];
  /** Documento enviado pela ONG (URL), por id do usuário; sem entrada, o mock gera um. */
  documents: Map<string, string>;
}

export interface MockEvent {
  item_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  reason: string | null;
  created_at: string;
}

const DEFAULT_PREFS: Preferences = { theme_color: 'AZUL', theme_mode: 'SYSTEM', show_donations: false };

const base = (id: string, name: string, email: string, role: User['role']): User => ({
  id,
  name,
  email,
  role,
  city: 'São Paulo',
  state: 'SP',
  bio: null,
  avatar_url: null,
  preferences: { ...DEFAULT_PREFS },
});

const ngoProfile = (
  id: string,
  cnpj: string,
  status: NonNullable<User['ngo_profile']>['status'],
  rejection: string | null = null,
) =>
  ({
    id,
    cnpj,
    website: null,
    status,
    rejection_reason: rejection,
    banner_url: null,
    phone: null,
    instagram: null,
    accepted_categories: [],
    address: null,
  }) satisfies NonNullable<User['ngo_profile']>;

function seed(): Map<string, MockUser> {
  const users: User[] = [
    {
      ...base(IDS.donor, 'Marina Souza', 'doadora@demo.conectadoacoes.local', 'DONOR'),
      bio: 'Doo o que não uso mais para quem precisa.',
      preferences: { ...DEFAULT_PREFS, show_donations: true },
    },
    { ...base(IDS.donor2, 'Carlos Lima', 'carlos@demo.conectadoacoes.local', 'DONOR'), city: 'Campinas' },
    {
      ...base(IDS.donor3, 'Paula Reis', 'paula@demo.conectadoacoes.local', 'DONOR'),
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
    {
      ...base(IDS.ngoActive2, 'Casa do Bem', 'casadobem@demo.conectadoacoes.local', 'NGO'),
      ngo_profile: ngoProfile('44444444-4444-4444-8444-444444444444', '98.765.432/0001-98', 'ATIVO'),
    },
    {
      ...base(IDS.ngoActive, 'ONG Salvadora', 'ong.ativa@demo.conectadoacoes.local', 'NGO'),
      bio: 'Atendemos 200 famílias na região central de São Paulo.',
      ngo_profile: {
        ...ngoProfile('44444444-4444-4444-8444-444444444441', '11.222.333/0001-81', 'ATIVO'),
        website: 'https://ongsalvadora.org.br',
        banner_url: mockBanner(),
        phone: '11987654321',
        instagram: 'ongsalvadora',
        accepted_categories: ['ROUPAS', 'BRINQUEDOS', 'LIVROS'],
        address: {
          cep: '01310100',
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Sala 12',
          neighborhood: 'Bela Vista',
        },
      },
    },
    {
      ...base(IDS.ngoPending, 'Instituto Novo Começo', 'ong.pendente@demo.conectadoacoes.local', 'NGO'),
      ngo_profile: ngoProfile('44444444-4444-4444-8444-444444444442', '45.997.418/0001-53', 'PENDENTE_APROVACAO'),
    },
    {
      ...base(IDS.ngoRejected, 'Casa Esperança', 'ong.rejeitada@demo.conectadoacoes.local', 'NGO'),
      ngo_profile: ngoProfile(
        '44444444-4444-4444-8444-444444444443',
        '12.345.678/0001-95',
        'REJEITADO',
        'O documento enviado está ilegível. Envie uma cópia mais nítida do cartão CNPJ.',
      ),
    },
    base(IDS.admin, 'Admin', 'admin@demo.conectadoacoes.local', 'ADMIN'),
  ];
  return new Map(users.map((user) => [user.id, { user, password: MOCK_PASSWORD }]));
}

/** Histórico dos itens do seed: publicação, escolha da ONG (1 h depois) e conclusão. */
function seedEvents(items: Map<string, MockItem>): MockEvent[] {
  const plusHour = (iso: string) => new Date(new Date(iso).getTime() + 3600 * 1000).toISOString();
  return [...items.values()].flatMap((i) => {
    const events: MockEvent[] = [
      {
        item_id: i.id,
        from_status: null,
        to_status: 'DISPONIVEL',
        actor_id: i.donor_id,
        reason: null,
        created_at: i.created_at,
      },
    ];
    if (i.status !== 'DISPONIVEL') {
      events.push({
        item_id: i.id,
        from_status: 'DISPONIVEL',
        to_status: 'EM_PROGRESSO',
        actor_id: i.donor_id,
        reason: null,
        created_at: plusHour(i.created_at),
      });
    }
    if (i.status === 'DOADO') {
      events.push({
        item_id: i.id,
        from_status: 'EM_PROGRESSO',
        to_status: 'DOADO',
        actor_id: i.selected_ngo_id,
        reason: null,
        created_at: i.completed_at!,
      });
    }
    return events;
  });
}

function fresh(): MockState {
  const { items, interests } = seedItems(IDS);
  const chats = seedChats(IDS);
  return {
    users: seed(),
    sessionUserId: null,
    items,
    interests,
    ...chats,
    events: seedEvents(items),
    documents: new Map(),
  };
}

let state: MockState = fresh();

export const db = {
  get state() {
    return state;
  },
  /** Volta ao seed (cada teste começa do zero). */
  reset() {
    state = fresh();
  },
  findByEmail(email: string) {
    const e = email.trim().toLowerCase();
    return [...state.users.values()].find((u) => u.user.email === e) ?? null;
  },
  sessionUser(): MockUser | null {
    return state.sessionUserId ? (state.users.get(state.sessionUserId) ?? null) : null;
  },
  /** Simula o cookie de sessão: o próximo /auth/me devolve este usuário. */
  loginAs(userId: string | null) {
    state.sessionUserId = userId;
  },
  insertUser(user: User, password: string) {
    state.users.set(user.id, { user, password });
    return user;
  },
  hasInterest(itemId: string, ngoId: string) {
    return state.interests.has(`${itemId}:${ngoId}`);
  },
  /** Registra uma transição de status do item (como a API grava em item_events). */
  addEvent(itemId: string, from: string | null, to: string, actorId: string | null, reason: string | null = null) {
    state.events.push({
      item_id: itemId,
      from_status: from,
      to_status: to,
      actor_id: actorId,
      reason,
      created_at: new Date().toISOString(),
    });
  },
  interestsCount(itemId: string) {
    return [...state.interests.keys()].filter((k) => k.startsWith(`${itemId}:`)).length;
  },
};
