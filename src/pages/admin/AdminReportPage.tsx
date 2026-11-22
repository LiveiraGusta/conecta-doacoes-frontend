import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import DeleteForeverRounded from '@mui/icons-material/DeleteForeverRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import GavelRounded from '@mui/icons-material/GavelRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/core/api/http';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { useReport } from '@/core/hooks/useAdmin';
import { removeItem, resolveReport, restoreItem } from '@/core/services/admin';
import type { ReportDetail } from '@/core/types/api';
import { cn } from '@/core/utils/cn';
import { formatDateTime } from '@/core/utils/format';
import { RemoveItemDialog } from '@/features/admin/RemoveItemDialog';

type Party = NonNullable<ReportDetail['reporter']> & { ngo_profile_id?: string | null };
type Event = NonNullable<ReportDetail['events']>[number];
type ItemReport = NonNullable<ReportDetail['item_reports']>[number];

function Box({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby={id}
      className={cn('flex min-w-0 flex-col gap-3 p-4', className)}
      sx={{ borderRadius: 3 }}
    >
      <Typography id={id} variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function PartyCard({ title, party, children }: { title: string; party: Party; children?: ReactNode }) {
  const { t } = useTranslation('admin');
  return (
    <Box title={title}>
      <div className="flex items-center gap-3">
        <Avatar name={party.name} seed={party.id} src={party.avatar_url} />
        <div className="flex min-w-0 flex-col">
          <Typography sx={{ fontWeight: 700 }}>{party.name}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {t(`report.roles.${party.role!}`)} · {party.email}
          </Typography>
        </div>
      </div>
      {children}
    </Box>
  );
}

/** Texto do evento do item: publicado, ONG escolhida, cancelada, concluída. */
function useEventLabel() {
  const { t } = useTranslation('admin');
  return (e: Event) => {
    if (!e.from_status) return t('report.events.created');
    if (e.to_status === 'EM_PROGRESSO') return t('report.events.selected');
    if (e.to_status === 'DISPONIVEL' || e.to_status === 'CANCELADO') return t('report.events.cancelled');
    if (e.to_status === 'DOADO') return t('report.events.donated');
    return t('report.events.other', { from: e.from_status, to: e.to_status });
  };
}

/** Categoria da denúncia de anúncio (mesmos rótulos do diálogo de quem denuncia). */
function CategoryChip({ category }: { category: ItemReport['category'] | null | undefined }) {
  const { t } = useTranslation('feed');
  if (!category) return null;
  return <Chip size="small" color="error" label={t(`reportItem.categories.${category}.label`)} />;
}

/** Ações sobre o anúncio denunciado: manter (descarta as denúncias) ou remover (com motivo para o doador). */
function useItemModeration(itemId: string) {
  const { t } = useTranslation(['admin', 'common']);
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const refresh = () => {
    for (const key of [['admin'], ['item'], ['feed'], ['myItems']])
      void queryClient.invalidateQueries({ queryKey: key });
  };
  const remove = useMutation({
    mutationFn: (reason: string) => removeItem(itemId, reason),
    onSuccess: (r) => {
      refresh();
      snackbar.show({
        message: t(r.cancelled_negotiation ? 'moderation.removedCancelled' : 'moderation.removed'),
        variant: 'success',
      });
    },
  });
  const restore = useMutation({
    mutationFn: () => restoreItem(itemId),
    onSuccess: () => {
      refresh();
      snackbar.show({ message: t('moderation.restored'), variant: 'success' });
    },
    onError: (e) =>
      snackbar.show({ message: e instanceof ApiError ? e.message : t('common:system.errorTitle'), variant: 'error' }),
  });
  return { remove, restore };
}

/**
 * Detalhe da denúncia (guia, F11 e F11b; decisões da fase 7).
 * Negociação: motivo, as duas partes, a conversa inteira com as mensagens da denunciada destacadas e a linha
 * do tempo; "Marcar como resolvida" é idempotente na API.
 * Anúncio: categoria, fotos e descrição, todas as denúncias do anúncio e as ações "Manter" e "Remover",
 * que valem para todas as denúncias abertas dele.
 */
export default function AdminReportPage() {
  const { t } = useTranslation(['admin', 'common']);
  const { reportId = '' } = useParams();
  const report = useReport(reportId);
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const eventLabel = useEventLabel();
  const [removing, setRemoving] = useState(false);
  const itemId = report.data?.item?.id ?? '';
  const moderation = useItemModeration(itemId);
  const resolve = useMutation({
    mutationFn: () => resolveReport(reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      snackbar.show({ message: t('report.resolved'), variant: 'success' });
    },
    onError: (e) =>
      snackbar.show({ message: e instanceof ApiError ? e.message : t('common:system.errorTitle'), variant: 'error' }),
  });

  const back = (
    <Button to="/admin/reports" variant="ghost" icon={<ArrowBackRounded />} className="self-start">
      {t('report.back')}
    </Button>
  );

  if (report.isPending) {
    return (
      <LoadingRegion label={t('report.loading')} className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-8">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </LoadingRegion>
    );
  }
  if (!report.data) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-8">
        {back}
        <EmptyState illustration="notFound" title={t('report.notFoundTitle')} />
      </section>
    );
  }

  const { report: r, item, reporter, reported, events = [], messages = [], item_reports = [] } = report.data;
  const isItem = r!.kind === 'ITEM';
  const resolved = r!.status === 'RESOLVIDA';
  const removed = item!.moderation_status === 'REMOVIDO';
  const hidden = item!.moderation_status === 'OCULTO';
  const people = new Map([reporter, reported].map((p) => [p!.id!, p!.name!]));
  const reportedId = reported!.id;
  const ngoId = (reported as Party).ngo_profile_id;
  const removeError = moderation.remove.error instanceof ApiError ? moderation.remove.error.message : null;

  let actions: ReactNode;
  if (!isItem) {
    actions = resolved ? (
      <Alert severity="success" icon={<TaskAltRounded />} sx={{ py: 0 }}>
        {t('report.alreadyResolved')}
      </Alert>
    ) : (
      <Button icon={<TaskAltRounded />} loading={resolve.isPending} onClick={() => resolve.mutate()}>
        {t('report.resolve')}
      </Button>
    );
  } else if (removed) {
    actions = (
      <div className="flex flex-wrap items-center gap-2">
        <Alert severity="error" icon={<DeleteForeverRounded />} sx={{ py: 0 }}>
          {t('moderation.isRemoved')}
        </Alert>
        <Button
          variant="secondary"
          icon={<VisibilityRounded />}
          loading={moderation.restore.isPending}
          onClick={() => moderation.restore.mutate()}
        >
          {t('moderation.republish')}
        </Button>
      </div>
    );
  } else if (resolved && !hidden) {
    actions = (
      <Alert severity="success" icon={<TaskAltRounded />} sx={{ py: 0 }}>
        {t(r!.resolution === 'IMPROCEDENTE' ? 'moderation.wasKept' : 'report.alreadyResolved')}
      </Alert>
    );
  } else {
    actions = (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          icon={<VisibilityRounded />}
          loading={moderation.restore.isPending}
          disabled={moderation.remove.isPending}
          onClick={() => moderation.restore.mutate()}
        >
          {t('moderation.keep')}
        </Button>
        <Button
          variant="danger"
          icon={<DeleteForeverRounded />}
          disabled={moderation.restore.isPending}
          onClick={() => {
            moderation.remove.reset();
            setRemoving(true);
          }}
        >
          {t('moderation.remove')}
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {t('report.title', { title: item!.title })}
            </Typography>
            <Chip size="small" variant="outlined" label={t(`reports.kind.${r!.kind!}`)} />
            <Chip size="small" label={t(`reports.badge.${r!.status!}`)} color={resolved ? 'success' : 'warning'} />
          </div>
          <Typography variant="body2" color="text.secondary">
            {t('report.createdAt', { date: formatDateTime(r!.created_at!) })}
          </Typography>
        </div>
        {actions}
      </div>

      {isItem && hidden && (
        <Alert severity="warning" icon={<FlagRounded />}>
          {t('moderation.hiddenNotice')}
        </Alert>
      )}

      <Box title={t('report.reason')}>
        {isItem && (
          <div className="flex">
            <CategoryChip category={r!.category} />
          </div>
        )}
        {r!.reason ? (
          <Typography component="blockquote" className="border-l-4 border-warning pl-3 whitespace-pre-line">
            {r!.reason}
          </Typography>
        ) : (
          <Typography color="text.secondary">{t('reports.noDescription')}</Typography>
        )}
      </Box>

      <div className="grid gap-4 md:grid-cols-3">
        <PartyCard title={t('report.reporter')} party={reporter as Party} />
        <PartyCard title={isItem ? t('report.advertiser') : t('report.reported')} party={reported as Party}>
          {ngoId && (
            <Button
              to={`/admin/ngos?ngo=${ngoId}`}
              size="sm"
              variant="secondary"
              icon={<GavelRounded />}
              className="self-start"
            >
              {t('report.moderateNgo')}
            </Button>
          )}
        </PartyCard>
        <Box title={t('report.item')}>
          <Typography sx={{ fontWeight: 700 }}>{item!.title}</Typography>
          <div className="flex flex-wrap gap-1">
            <Chip size="small" label={t(`report.itemStatus.${item!.status!}`)} />
            {item!.moderation_status !== 'VISIVEL' && (
              <Chip
                size="small"
                icon={<FlagRounded />}
                color={removed ? 'error' : 'warning'}
                label={t(`reports.moderation.${item!.moderation_status!}`)}
              />
            )}
          </div>
          {removed && item!.moderation_reason && (
            <Typography variant="body2" color="text.secondary">
              {t('report.eventReason', { reason: item!.moderation_reason })}
            </Typography>
          )}
          <Button
            to={`/items/${item!.id}`}
            size="sm"
            variant="ghost"
            icon={<OpenInNewRounded />}
            className="self-start"
          >
            {t('report.viewItem')}
          </Button>
        </Box>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {isItem ? (
          <Box title={t('report.content')}>
            <ul className="grid grid-cols-3 gap-2">
              {(item!.photos ?? []).map((src, i) => (
                <li key={src}>
                  <a href={src} target="_blank" rel="noreferrer" aria-label={t('report.photo', { n: i + 1 })}>
                    <img src={src} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />
                  </a>
                </li>
              ))}
            </ul>
            {item!.description ? (
              <Typography className="whitespace-pre-line">{item!.description}</Typography>
            ) : (
              <Typography color="text.secondary">{t('report.noItemDescription')}</Typography>
            )}
          </Box>
        ) : (
          <Box title={t('report.conversation')}>
            {messages.length === 0 ? (
              <Typography color="text.secondary">{t('report.noMessages')}</Typography>
            ) : (
              <ol className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto rounded-xl bg-surface-alt p-3">
                {messages.map((m) => {
                  const fromReported = m.sender_id === reportedId;
                  return (
                    <li
                      key={m.id}
                      className={cn(
                        'flex flex-col gap-0.5 rounded-xl bg-surface px-3 py-2',
                        fromReported && 'border-2 border-warning',
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                        <strong className="text-fg">{people.get(m.sender_id) ?? m.sender_id}</strong>
                        <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                        {fromReported && (
                          <Chip
                            size="small"
                            color="warning"
                            icon={<FlagRounded />}
                            label={t('report.reportedMessage')}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </span>
                      <span className="whitespace-pre-wrap">{m.message}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Box>
        )}
        <Box title={t('report.timeline')}>
          <ol className="flex flex-col gap-4 border-l-2 border-border pl-4">
            {events.map((e, i) => (
              <li key={i} className="relative flex flex-col">
                <span className="absolute top-1.5 -left-[1.35rem] size-2.5 rounded-full bg-primary" aria-hidden />
                <Typography sx={{ fontWeight: 600 }}>{eventLabel(e)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {e.created_at && formatDateTime(e.created_at)}
                  {e.actor_id && people.has(e.actor_id) && ` · ${t('report.by', { name: people.get(e.actor_id) })}`}
                </Typography>
                {e.reason && (
                  <Typography variant="body2" color="text.secondary">
                    {t('report.eventReason', { reason: e.reason })}
                  </Typography>
                )}
              </li>
            ))}
          </ol>
        </Box>
      </div>

      {isItem && (
        <Box title={t('report.itemReports', { count: item_reports.length })}>
          <ul className="flex flex-col divide-y divide-border">
            {item_reports.map((ir) => (
              <li key={ir.id} className={cn('flex flex-col gap-1 py-2', ir.id === r!.id && 'font-semibold')}>
                <span className="flex flex-wrap items-center gap-2">
                  <CategoryChip category={ir.category} />
                  <span>{ir.reporter.name}</span>
                  <Typography component="span" variant="caption" color="text.secondary">
                    {t(`report.roles.${ir.reporter.role}`)} · {formatDateTime(ir.created_at)} ·{' '}
                    {t(`reports.badge.${ir.status}`)}
                  </Typography>
                </span>
                {ir.reason && (
                  <Typography variant="body2" className="whitespace-pre-line">
                    “{ir.reason}”
                  </Typography>
                )}
              </li>
            ))}
          </ul>
        </Box>
      )}

      {removing && (
        <RemoveItemDialog
          open
          title={item!.title!}
          inProgress={item!.status === 'EM_PROGRESSO'}
          loading={moderation.remove.isPending}
          error={removeError}
          onConfirm={(reason) => moderation.remove.mutate(reason, { onSuccess: () => setRemoving(false) })}
          onClose={() => setRemoving(false)}
        />
      )}
    </section>
  );
}
