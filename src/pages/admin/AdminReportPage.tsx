import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import GavelRounded from '@mui/icons-material/GavelRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/core/api/http';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { useReport } from '@/core/hooks/useAdmin';
import { resolveReport } from '@/core/services/admin';
import type { ReportDetail } from '@/core/types/api';
import { cn } from '@/core/utils/cn';
import { formatDateTime } from '@/core/utils/format';

type Party = NonNullable<ReportDetail['reporter']> & { ngo_profile_id?: string | null };
type Event = NonNullable<ReportDetail['events']>[number];

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
    if (e.to_status === 'DISPONIVEL') return t('report.events.cancelled');
    if (e.to_status === 'DOADO') return t('report.events.donated');
    return t('report.events.other', { from: e.from_status, to: e.to_status });
  };
}

/**
 * Detalhe da denúncia (guia, F11; decisões da fase 7): motivo, as duas partes, o item, a conversa inteira
 * com as mensagens da denunciada destacadas e a linha do tempo. Se a denunciada for ONG, atalho para a
 * moderação dela. "Marcar como resolvida" é idempotente na API.
 */
export default function AdminReportPage() {
  const { t } = useTranslation(['admin', 'common']);
  const { reportId = '' } = useParams();
  const report = useReport(reportId);
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const eventLabel = useEventLabel();
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

  const { report: r, item, reporter, reported, events = [], messages = [] } = report.data;
  const resolved = r!.status === 'RESOLVIDA';
  const people = new Map([reporter, reported].map((p) => [p!.id!, p!.name!]));
  const reportedId = reported!.id;
  const ngoId = (reported as Party).ngo_profile_id;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
              {t('report.title', { title: item!.title })}
            </Typography>
            <Chip size="small" label={t(`reports.badge.${r!.status!}`)} color={resolved ? 'success' : 'warning'} />
          </div>
          <Typography variant="body2" color="text.secondary">
            {t('report.createdAt', { date: formatDateTime(r!.created_at!) })}
          </Typography>
        </div>
        {resolved ? (
          <Alert severity="success" icon={<TaskAltRounded />} sx={{ py: 0 }}>
            {t('report.alreadyResolved')}
          </Alert>
        ) : (
          <Button icon={<TaskAltRounded />} loading={resolve.isPending} onClick={() => resolve.mutate()}>
            {t('report.resolve')}
          </Button>
        )}
      </div>

      <Box title={t('report.reason')}>
        <Typography component="blockquote" className="border-l-4 border-warning pl-3 whitespace-pre-line">
          {r!.reason}
        </Typography>
      </Box>

      <div className="grid gap-4 md:grid-cols-3">
        <PartyCard title={t('report.reporter')} party={reporter as Party} />
        <PartyCard title={t('report.reported')} party={reported as Party}>
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
          <Chip size="small" label={t(`report.itemStatus.${item!.status!}`)} className="self-start" />
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
    </section>
  );
}
