import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ChatRounded from '@mui/icons-material/ChatRounded';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/core/api/http';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { itemKey, useItem } from '@/core/hooks/useItem';
import { interestsKey, useInterests } from '@/core/hooks/useMyItems';
import { selectNgo } from '@/core/services/items';
import type { InterestedNgo } from '@/core/types/api';
import { InterestedNgoCard, InterestedNgoCardSkeleton } from '@/features/donations/InterestedNgoCard';

/** O servidor sabe mais que a tela: recarrega item e lista (guia, F8.2). */
const STALE_CODES = new Set(['ITEM_NOT_AVAILABLE', 'NGO_NOT_INTERESTED', 'NGO_NOT_ACTIVE']);

const PAGE = 'mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8';

/**
 * ONGs interessadas num item do doador (guia, F8): lista, "Escolher" com confirmação e, ao escolher,
 * a conversa abre (`chat_room_url`). Item já em negociação ou doado: lista só para consulta.
 */
export default function InterestsPage() {
  const { t } = useTranslation(['donations', 'common']);
  const { itemId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const item = useItem(itemId);
  const interests = useInterests(itemId);
  const [choosing, setChoosing] = useState<InterestedNgo | null>(null);

  const mutation = useMutation({
    mutationFn: (ngo: InterestedNgo) => selectNgo(itemId, ngo.ngo_id),
    onSuccess: async (selection, ngo) => {
      setChoosing(null);
      snackbar.show({ message: t('interests.selected', { name: ngo.name }), variant: 'success' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['myItems'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: itemKey('auth', itemId) }),
        queryClient.invalidateQueries({ queryKey: interestsKey(itemId) }),
      ]);
      navigate(selection.chat_room_url);
    },
    onError: (error) => {
      setChoosing(null);
      snackbar.show({
        message: error instanceof ApiError ? error.message : t('interests.errorDescription'),
        variant: 'error',
      });
      if (error instanceof ApiError && STALE_CODES.has(error.code)) {
        void queryClient.invalidateQueries({ queryKey: itemKey('auth', itemId) });
        void queryClient.invalidateQueries({ queryKey: interestsKey(itemId) });
      }
    },
  });

  const backButton = (
    <Button to="/donations" variant="ghost" icon={<ArrowBackRounded />} className="self-start">
      {t('interests.back')}
    </Button>
  );

  // Item de outro doador (403) ou que não existe (404): mesma tela, sem revelar qual dos dois.
  const denied = [item.error, interests.error].some(
    (e) => e instanceof ApiError && (e.status === 403 || e.status === 404),
  );
  if (denied) {
    return (
      <section className={PAGE}>
        {backButton}
        <EmptyState
          illustration="notFound"
          title={t('interests.forbiddenTitle')}
          description={t('interests.forbiddenDescription')}
        />
      </section>
    );
  }

  const data = item.data;
  const list = interests.data?.interested_ngos ?? [];
  const available = data?.status === 'DISPONIVEL';

  let content;
  if (interests.isPending) {
    content = (
      <LoadingRegion label={t('interests.loading')}>
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <InterestedNgoCardSkeleton key={i} />
          ))}
        </ul>
      </LoadingRegion>
    );
  } else if (interests.isError) {
    content = (
      <EmptyState
        illustration="error"
        title={t('interests.errorTitle')}
        description={t('interests.errorDescription')}
        action={<Button onClick={() => void interests.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  } else if (list.length === 0) {
    content = (
      <EmptyState
        illustration="waiting"
        title={t('interests.emptyTitle')}
        description={t('interests.emptyDescription', { city: user?.city ?? '' })}
      />
    );
  } else {
    content = (
      <ul className="flex flex-col gap-3">
        {list.map((ngo) => (
          <InterestedNgoCard
            key={ngo.interest_id}
            ngo={ngo}
            canChoose={available}
            chosen={Boolean(data?.selected_ngo_id) && ngo.ngo_id === data?.selected_ngo_id}
            onChoose={() => setChoosing(ngo)}
          />
        ))}
      </ul>
    );
  }

  return (
    <section className={PAGE} aria-labelledby="interests-title">
      {backButton}
      <Paper variant="outlined" className="flex items-center gap-4 p-3" sx={{ borderRadius: 3 }}>
        {data ? (
          <>
            {data.photos[0] && (
              <img src={data.photos[0]} alt="" className="aspect-[4/3] w-24 shrink-0 rounded-lg object-cover" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <Typography id="interests-title" variant="h6" component="h2" className="break-words">
                {t('interests.title')}: {data.title}
              </Typography>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">{t(`common:categories.${data.category}`)}</Badge>
                {interests.data && (
                  <Typography variant="body2" color="text.secondary">
                    {t('interests.count', { count: interests.data.total })}
                  </Typography>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <Skeleton className="aspect-[4/3] w-24" />
            <Typography id="interests-title" variant="h6" component="h2">
              {t('interests.title')}
            </Typography>
          </>
        )}
      </Paper>
      {data && !available && (
        <Alert
          severity="info"
          action={
            <Button to={`/chats/${itemId}`} size="sm" variant="ghost" icon={<ChatRounded />}>
              {t('interests.openChat')}
            </Button>
          }
        >
          {data.status === 'DOADO' ? t('interests.donated') : t('interests.inProgress')}
        </Alert>
      )}
      {content}
      <ConfirmDialog
        open={Boolean(choosing)}
        title={t('interests.confirmTitle', { name: choosing?.name ?? '' })}
        confirmLabel={t('interests.confirm')}
        loading={mutation.isPending}
        onConfirm={() => choosing && mutation.mutate(choosing)}
        onCancel={() => setChoosing(null)}
      >
        {t('interests.confirmText')}
      </ConfirmDialog>
    </section>
  );
}
