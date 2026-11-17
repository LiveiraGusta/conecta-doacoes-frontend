import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { adminNgosKey, NGO_STATUSES, useAdminNgoLookup, useAdminNgos } from '@/core/hooks/useAdmin';
import { useInfiniteTrigger } from '@/core/hooks/useInfiniteTrigger';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import type { AdminNgo, NgoStatus } from '@/core/types/api';
import { formatDate } from '@/core/utils/format';
import { NGO_SLUGS, NGO_STATUS_COLOR } from '@/features/admin/adminStatus';
import { NgoReviewModal } from '@/features/admin/NgoReviewModal';

const fromSlug = (slug: string | null): NgoStatus =>
  NGO_STATUSES.find((s) => NGO_SLUGS[s] === slug) ?? 'PENDENTE_APROVACAO';

/**
 * Moderação de ONGs (guia, F5): abas por situação (na URL), tabela no desktop e cards no celular,
 * mais antigas primeiro. "Analisar" abre a ficha (`?ngo=`), que também vem do atalho da denúncia.
 */
export default function AdminNgosPage() {
  const { t } = useTranslation(['admin', 'common']);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = fromSlug(params.get('status'));
  const selectedId = params.get('ngo');
  const list = useAdminNgos(status);
  const items = list.data?.items ?? [];

  // A ficha vem da lista da aba; se não estiver nela (atalho da denúncia), procura nas outras.
  const inList = items.find((n) => n.ngo_profile_id === selectedId) ?? null;
  const lookup = useAdminNgoLookup(selectedId && !inList && !list.isPending ? selectedId : null);
  const selected = inList ?? lookup.data ?? null;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };
  const sentinel = useInfiniteTrigger(loadMore, Boolean(hasNextPage) && !isFetchingNextPage);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };
  const open = (ngo: AdminNgo) => update({ ngo: ngo.ngo_profile_id! });

  const reviewButton = (ngo: AdminNgo) => (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => open(ngo)}
      aria-label={t('ngos.reviewNgo', { name: ngo.name })}
    >
      {t('ngos.review')}
    </Button>
  );

  let content;
  if (list.isPending) {
    content = (
      <LoadingRegion label={t('ngos.loading')} className="flex flex-col gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </LoadingRegion>
    );
  } else if (list.isError) {
    content = (
      <EmptyState
        illustration="error"
        title={t('ngos.errorTitle')}
        action={<Button onClick={() => void list.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState
        illustration="empty"
        title={t('ngos.emptyTitle')}
        description={status === 'PENDENTE_APROVACAO' ? t('ngos.emptyPending') : t('ngos.emptyOther')}
      />
    );
  } else if (isMobile) {
    content = (
      <ul className="flex flex-col gap-3">
        {items.map((ngo) => (
          <Paper
            key={ngo.ngo_profile_id}
            component="li"
            variant="outlined"
            className="flex flex-col gap-2 p-4"
            sx={{ borderRadius: 3 }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <Typography sx={{ fontWeight: 700 }}>{ngo.name}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {ngo.email}
                </Typography>
              </div>
              <Chip size="small" label={t(`ngos.badge.${ngo.status!}`)} color={NGO_STATUS_COLOR[ngo.status!]} />
            </div>
            <Typography variant="body2">
              {ngo.city} - {ngo.state} · <span className="font-mono">{ngo.cnpj}</span>
            </Typography>
            <div className="flex items-center justify-between">
              <Typography variant="caption" color="text.secondary">
                {ngo.created_at && formatDate(ngo.created_at)}
              </Typography>
              {reviewButton(ngo)}
            </div>
          </Paper>
        ))}
      </ul>
    );
  } else {
    content = (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table aria-label={t(`ngos.status.${status}`)}>
          <TableHead>
            <TableRow>
              <TableCell>{t('ngos.columns.ngo')}</TableCell>
              <TableCell>{t('ngos.columns.city')}</TableCell>
              <TableCell>{t('ngos.columns.cnpj')}</TableCell>
              <TableCell>{t('ngos.columns.since')}</TableCell>
              <TableCell align="right">{t('ngos.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((ngo) => (
              <TableRow key={ngo.ngo_profile_id} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>{ngo.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {ngo.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  {ngo.city} - {ngo.state}
                </TableCell>
                <TableCell className="font-mono whitespace-nowrap">{ngo.cnpj}</TableCell>
                <TableCell>{ngo.created_at && formatDate(ngo.created_at)}</TableCell>
                <TableCell align="right">{reviewButton(ngo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      <Tabs
        value={status}
        onChange={(_, s: NgoStatus) => update({ status: s === 'PENDENTE_APROVACAO' ? null : NGO_SLUGS[s], ngo: null })}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label={t('ngos.tabs')}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {NGO_STATUSES.map((s) => (
          <Tab key={s} value={s} label={t(`ngos.status.${s}`)} />
        ))}
      </Tabs>
      {content}
      <div ref={sentinel} className="flex justify-center">
        {hasNextPage && (
          <Button variant="secondary" loading={isFetchingNextPage} onClick={loadMore}>
            {t('ngos.loadMore')}
          </Button>
        )}
      </div>
      <NgoReviewModal
        key={selected?.ngo_profile_id}
        ngo={selected}
        onClose={() => update({ ngo: null })}
        reloading={list.isRefetching || lookup.isRefetching}
        onReload={() => {
          void queryClient.invalidateQueries({ queryKey: adminNgosKey(status) });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'ngo'] });
        }}
      />
    </section>
  );
}
