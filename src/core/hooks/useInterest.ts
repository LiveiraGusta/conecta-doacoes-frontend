import { useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../api/http';
import { useSnackbar } from '../feedback/useSnackbar';
import { addInterest, removeInterest } from '../services/items';
import type { Paginated } from '../types/api';
import type { FeedCardItem } from './useFeed';
import { itemKey, type ItemView } from './useItem';

interface Vars {
  id: string;
  /** Estado desejado: true = "Tenho interesse", false = desfazer. */
  interested: boolean;
  /** Sem snackbar de sucesso (o "Desfazer" do próprio snackbar). */
  silent?: boolean;
}

type Interestable = Pick<FeedCardItem, 'id' | 'has_user_interest' | 'interests_count'>;

const toggle = <T extends Interestable>(item: T, id: string, interested: boolean): T =>
  item.id !== id || item.has_user_interest === interested
    ? item
    : {
        ...item,
        has_user_interest: interested,
        interests_count:
          item.interests_count === null ? null : Math.max(0, item.interests_count + (interested ? 1 : -1)),
      };

/** Erros em que o servidor sabe mais que a tela: avisa e recarrega o item (guia, F7.3 e §1.3). */
const STALE_CODES = new Set(['ITEM_NOT_AVAILABLE', 'ALREADY_SELECTED', 'ALREADY_INTERESTED', 'INTEREST_NOT_FOUND']);

/**
 * "Tenho interesse" / "Desfazer interesse" otimista (plano, fase 3): o botão muda na hora no feed e no detalhe;
 * se a API recusar, volta ao que era e mostra a mensagem dela. O sucesso traz "Desfazer" no snackbar.
 */
export function useInterest() {
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const { t } = useTranslation('feed');

  const mutation = useMutation({
    mutationFn: async ({ id, interested }: Vars): Promise<void> => {
      if (interested) await addInterest(id);
      else await removeInterest(id);
    },

    onMutate: async ({ id, interested }) => {
      const feedFilter = { queryKey: ['feed', 'auth'] as QueryKey };
      await queryClient.cancelQueries(feedFilter);
      await queryClient.cancelQueries({ queryKey: itemKey('auth', id) });

      const feeds = queryClient.getQueriesData<InfiniteData<Paginated<FeedCardItem>>>(feedFilter);
      const detail = queryClient.getQueryData<ItemView>(itemKey('auth', id));

      queryClient.setQueriesData<InfiniteData<Paginated<FeedCardItem>>>(
        feedFilter,
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((p) => ({ ...p, data: p.data.map((i) => toggle(i, id, interested)) })),
          },
      );
      if (detail) queryClient.setQueryData(itemKey('auth', id), toggle(detail, id, interested));
      return { feeds, detail };
    },

    onError: (error, { id }, ctx) => {
      ctx?.feeds.forEach(([key, data]) => queryClient.setQueryData(key, data));
      if (ctx?.detail) queryClient.setQueryData(itemKey('auth', id), ctx.detail);

      const message = error instanceof ApiError ? error.message : t('list.errorDescription');
      snackbar.show({ message, variant: 'error' });
      if (error instanceof ApiError && STALE_CODES.has(error.code)) {
        void queryClient.invalidateQueries({ queryKey: ['feed', 'auth'] });
        void queryClient.invalidateQueries({ queryKey: itemKey('auth', id) });
      }
    },

    onSuccess: (_data, { id, interested, silent }) => {
      if (silent) return;
      if (interested) {
        snackbar.show({
          message: t('interest.added'),
          variant: 'success',
          action: {
            label: t('interest.undo'),
            onClick: () => mutation.mutate({ id, interested: false, silent: true }),
          },
        });
      } else {
        snackbar.show({ message: t('interest.removed'), variant: 'info' });
      }
    },
  });

  return mutation;
}
