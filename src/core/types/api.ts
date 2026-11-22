// Nomes amigáveis para os tipos gerados do openapi.yaml (api.gen.ts).
// Quando o contrato muda: `npm run gen:api` e o TypeScript aponta o que quebrou.
import type { components } from './api.gen';

type Schemas = components['schemas'];

// ── Enums ──
export type Role = Schemas['Role'];
export type NgoStatus = Schemas['NgoStatus'];
export type Category = Schemas['Category'];
export type ItemStatus = Schemas['ItemStatus'];
export type ModerationStatus = Schemas['ModerationStatus'];
export type ReportKind = Schemas['ReportKind'];
export type ReportCategory = Schemas['ReportCategory'];
export type ReportResolution = Schemas['ReportResolution'];
export type UF = Schemas['UF'];
export type ThemeColor = Schemas['ThemeColor'];
export type ThemeMode = Schemas['ThemeMode'];

// ── Usuário e sessão ──
export type User = Schemas['User'];
export type NgoProfile = Schemas['NgoProfile'];
export type Address = Schemas['Address'];
export type Preferences = Schemas['Preferences'];
export type AuthResponse = Schemas['AuthResponse'];

// ── Itens ──
export type Item = Schemas['Item'];
export type ItemDetail = Schemas['ItemDetail'];
export type FeedItem = Schemas['FeedItem'];
export type ItemList = Schemas['ItemList'];
export type Photo = Schemas['Photo'];
export type Donor = Schemas['Donor'];

// ── Interesse ──
export type Interest = Schemas['Interest'];
export type InterestedNgo = Schemas['InterestedNgo'];
export type InterestList = Schemas['InterestList'];
export type Selection = Schemas['Selection'];

// ── Chat ──
export type ChatSummary = Schemas['ChatSummary'];
export type ChatRoom = Schemas['ChatRoom'];
export type Message = Schemas['Message'];
export type Counterpart = Schemas['Counterpart'];
export type UnreadSummary = Schemas['UnreadSummary'];

// ── Denúncias e moderação ──
export type Report = Schemas['Report'];
export type ReportSummary = Schemas['ReportSummary'];
export type ReportDetail = Schemas['ReportDetail'];
export type ModerationResult = Schemas['ModerationResult'];
export type AdminNgo = Schemas['AdminNgo'];

// ── Página pessoal e visitante ──
export type UserProfile = Schemas['UserProfile'];
export type UserDonations = Schemas['UserDonations'];
export type PublicItem = Schemas['PublicItem'];
export type PublicItemList = Schemas['PublicItemList'];
export type PublicUser = Schemas['PublicUser'];

// ── Erros ──
export type ApiErrorBody = Schemas['Error'];
export type ErrorDetail = NonNullable<ApiErrorBody['details']>[number];

/** Lista paginada genérica: `{ total, data }`. Há mais páginas enquanto `offset + data.length < total`. */
export interface Paginated<T> {
  total: number;
  data: T[];
}
