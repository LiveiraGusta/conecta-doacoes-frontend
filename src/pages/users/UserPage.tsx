import EditRounded from '@mui/icons-material/EditRounded';
import LoginRounded from '@mui/icons-material/LoginRounded';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/core/api/http';
import { useAuth } from '@/core/auth/useAuth';
import { useLoginPrompt } from '@/core/feedback/useLoginPrompt';
import { useUserPage } from '@/core/hooks/useUserPage';
import { cn } from '@/core/utils/cn';
import { CityLine } from '@/features/feed/itemParts';
import { DonationsGrid, NgoContactCard } from '@/features/profile/UserPageParts';

const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

/**
 * Página pessoal (plano, "/u/:userId"): doador (nome abreviado, descrição, doações concluídas se ele
 * mostrar) e ONG (banner, descrição, categorias aceitas, contato e doações recebidas). Visitante vê a
 * versão pública, sem nome, foto, banner nem contatos. Desktop em duas colunas; celular em uma.
 */
export default function UserPage() {
  const { t } = useTranslation(['profile', 'common']);
  const { userId = '' } = useParams();
  const { user } = useAuth();
  const loginPrompt = useLoginPrompt();
  const page = useUserPage(userId);

  if (page.isPending) {
    return (
      <LoadingRegion label={t('page.loading')} className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-8">
        <Skeleton className="aspect-[3/1] max-h-64 w-full rounded-2xl" />
        <div className="flex items-center gap-4">
          <Skeleton circle className="size-24" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      </LoadingRegion>
    );
  }

  if (!page.data) {
    const notFound = page.error instanceof ApiError && page.error.status === 404;
    return (
      <EmptyState
        illustration={notFound ? 'notFound' : 'error'}
        title={notFound ? t('page.notFoundTitle') : t('common:system.errorTitle')}
        description={notFound ? t('page.notFoundDescription') : undefined}
        action={
          notFound ? (
            <Button to="/feed" variant="secondary">
              {t('common:actions.goHome')}
            </Button>
          ) : (
            <Button onClick={() => void page.refetch()}>{t('common:actions.retry')}</Button>
          )
        }
      />
    );
  }

  const p = page.data;
  const self = user?.id === p.id;
  const isNgo = p.role === 'NGO';
  const name = p.name ?? (isNgo ? t('page.ngo') : t('page.donor'));
  const banner = p.ngo?.banner_url;
  const status = p.ngo?.status;

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-4 pb-8 md:px-8 md:pt-6">
      <header className="flex flex-col">
        {isNgo &&
          (banner ? (
            <img src={banner} alt="" className="aspect-[3/1] max-h-72 w-full rounded-2xl object-cover" />
          ) : (
            <div className="aspect-[3/1] max-h-72 w-full rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800" />
          ))}
        {/* Celular: avatar e texto empilhados; desktop: lado a lado. Na ONG, só o avatar sobe para o banner. */}
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4', isNgo && 'px-4')}>
          <Avatar
            name={p.name ?? undefined}
            seed={p.id}
            src={p.avatar_url}
            size="xl"
            className={cn(
              '!size-24 shrink-0 border-4 border-surface text-3xl md:!size-32',
              isNgo && '-mt-12 md:-mt-16',
            )}
          />
          <div className={cn('flex min-w-0 flex-1 flex-col gap-1', isNgo && 'sm:pt-3')}>
            <div className="flex flex-wrap items-center gap-2">
              <Typography
                variant="h4"
                component="h2"
                sx={{ fontWeight: 700, fontSize: { xs: '1.6rem', md: '2.1rem' } }}
              >
                {name}
              </Typography>
              <Badge tone="primary">{isNgo ? t('page.ngo') : t('page.donor')}</Badge>
              {status && status !== 'ATIVO' && <Chip size="small" color="warning" label={t(`page.status.${status}`)} />}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <CityLine city={p.city} state={p.state} />
              {p.member_since && (
                <Typography variant="body2" color="text.secondary">
                  {t('page.memberSince', { date: monthYear.format(new Date(p.member_since)) })}
                </Typography>
              )}
            </div>
          </div>
          {self && (
            <Button to="/profile" variant="secondary" icon={<EditRounded />} className="self-start sm:mt-3">
              {t('page.edit')}
            </Button>
          )}
        </div>
      </header>

      {p.isPublic && (
        <Alert
          severity="info"
          action={
            <Button size="sm" variant="ghost" icon={<LoginRounded />} onClick={() => loginPrompt.prompt(`/u/${p.id}`)}>
              {t('page.login')}
            </Button>
          }
        >
          {t('page.visitorHint')}
        </Alert>
      )}

      <div className={isNgo && !p.isPublic ? 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]' : 'flex flex-col gap-6'}>
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3">
            <Typography color={p.bio ? 'text.primary' : 'text.secondary'} className="whitespace-pre-line">
              {p.bio ?? t('page.noBio')}
            </Typography>
            {isNgo && p.ngo && p.ngo.accepted_categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Typography variant="subtitle2" component="span">
                  {t('page.accepts')}:
                </Typography>
                {p.ngo.accepted_categories.map((c) => (
                  <Badge key={c} tone="accent">
                    {t(`common:categories.${c}`)}
                  </Badge>
                ))}
              </div>
            )}
          </section>
          <DonationsGrid page={p} self={self} />
        </div>
        {isNgo && !p.isPublic && (
          <aside>
            <NgoContactCard page={p} />
          </aside>
        )}
      </div>
    </article>
  );
}
