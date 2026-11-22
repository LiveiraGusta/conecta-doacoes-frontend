import type { NgoStatus } from '@/core/types/api';

/** Cor do selo de situação da ONG (fila e análise). */
export const NGO_STATUS_COLOR: Record<NgoStatus, 'warning' | 'success' | 'error'> = {
  PENDENTE_APROVACAO: 'warning',
  ATIVO: 'success',
  REJEITADO: 'error',
};

/** Situação na URL em português curto: `?status=aprovadas`. */
export const NGO_SLUGS: Record<NgoStatus, string> = {
  PENDENTE_APROVACAO: 'analise',
  ATIVO: 'aprovadas',
  REJEITADO: 'rejeitadas',
};
