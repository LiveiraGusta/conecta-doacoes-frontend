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
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { useReports } from '@/core/hooks/useAdmin';
import { useInfiniteTrigger } from '@/core/hooks/useInfiniteTrigger';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import type { ReportStatus } from '@/core/services/admin';
import type { ReportSummary } from '@/core/types/api';
import { formatDate } from '@/core/utils/format';

const STATUSES: ReportStatus[] = ['ABERTA', 'RESOLVIDA'];

function Parties({ report }: { report: ReportSummary }) {
  const { t } = useTranslation('admin');
  return (
    <span className="flex flex-col text-sm">
      <span>
        {report.reporter?.name} <span className="text-fg-muted">({t(`report.roles.${report.reporter!.role}`)})</span>
      </span>
      <span>
        → {report.reported?.name} <span className="text-fg-muted">({t(`report.roles.${report.reported!.role}`)})</span>
      </span>
    </span>
  );
}

/** Fila de denúncias (guia, F11): abas Abertas / Resolvidas, mais antigas primeiro; tabela no desktop, cards no celular. */
export default function AdminReportsPage() {
  const { t } = useTranslation(['admin', 'common']);
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const status: ReportStatus = params.get('status') === 'resolvidas' ? 'RESOLVIDA' : 'ABERTA';
  const list = useReports(status);
  const items = list.data?.items ?? [];

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };
  const sentinel = useInfiniteTrigger(loadMore, Boolean(hasNextPage) && !isFetchingNextPage);

  const openLink = (r: ReportSummary) => (
    <Button
      to={`/admin/reports/${r.id}`}
      size="sm"
      variant="secondary"
      aria-label={t('reports.openReport', { title: r.item?.title })}
    >
      {t('reports.open')}
    </Button>
  );

  let content;
  if (list.isPending) {
    content = (
      <LoadingRegion label={t('reports.loading')} className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </LoadingRegion>
    );
  } else if (list.isError) {
    content = (
      <EmptyState
        illustration="error"
        title={t('reports.errorTitle')}
        action={<Button onClick={() => void list.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  } else if (items.length === 0) {
    content = (
      <EmptyState
        illustration="empty"
        title={t('ngos.emptyTitle')}
        description={status === 'ABERTA' ? t('reports.emptyOpen') : t('reports.emptyResolved')}
      />
    );
  } else if (isMobile) {
    content = (
      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <Paper
            key={r.id}
            component="li"
            variant="outlined"
            className="flex flex-col gap-2 p-4"
            sx={{ borderRadius: 3 }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <Typography sx={{ fontWeight: 700 }}>{r.item?.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {r.created_at && formatDate(r.created_at)}
              </Typography>
            </div>
            <Typography variant="body2" className="line-clamp-2">
              “{r.reason}”
            </Typography>
            <Parties report={r} />
            <div className="flex justify-end">{openLink(r)}</div>
          </Paper>
        ))}
      </ul>
    );
  } else {
    content = (
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table aria-label={t(`reports.status.${status}`)}>
          <TableHead>
            <TableRow>
              <TableCell>{t('reports.columns.date')}</TableCell>
              <TableCell>{t('reports.columns.reason')}</TableCell>
              <TableCell>{t('reports.columns.item')}</TableCell>
              <TableCell>{t('reports.columns.parties')}</TableCell>
              <TableCell align="right">{t('reports.columns.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell className="whitespace-nowrap">{r.created_at && formatDate(r.created_at)}</TableCell>
                <TableCell className="max-w-sm">
                  <span className="line-clamp-2">{r.reason}</span>
                </TableCell>
                <TableCell>
                  <RouterLink to={`/items/${r.item?.id}`} className="font-semibold hover:underline">
                    {r.item?.title}
                  </RouterLink>
                </TableCell>
                <TableCell>
                  <Parties report={r} />
                </TableCell>
                <TableCell align="right">{openLink(r)}</TableCell>
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
        onChange={(_, s: ReportStatus) =>
          setParams(s === 'RESOLVIDA' ? { status: 'resolvidas' } : {}, { replace: true })
        }
        aria-label={t('reports.tabs')}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {STATUSES.map((s) => (
          <Tab key={s} value={s} label={t(`reports.status.${s}`)} />
        ))}
      </Tabs>
      {content}
      <div ref={sentinel} className="flex justify-center">
        {hasNextPage && (
          <Button variant="secondary" loading={isFetchingNextPage} onClick={loadMore}>
            {t('reports.loadMore')}
          </Button>
        )}
      </div>
    </section>
  );
}
