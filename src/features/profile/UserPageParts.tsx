import InstagramIcon from '@mui/icons-material/Instagram';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/core/auth/useAuth';
import type { FeedCardItem } from '@/core/hooks/useFeed';
import { useUserDonations, type UserPageView } from '@/core/hooks/useUserPage';
import { maskCep, maskPhone } from '@/core/schemas/profile';
import type { Address } from '@/core/types/api';

const addressLine = (a: Address) =>
  `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''} - ${a.neighborhood}`;

/** Link do Google Maps por texto (sem chave de API nem mapa embutido). */
const mapsUrl = (a: Address, city: string, state: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${addressLine(a)}, ${city} - ${state}, ${maskCep(a.cep)}`,
  )}`;

function ContactRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-primary-text" aria-hidden>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">{children}</span>
    </li>
  );
}

/** Contato da ONG: endereço (com mapa), telefone/WhatsApp, Instagram e site. */
export function NgoContactCard({ page }: { page: UserPageView }) {
  const { t } = useTranslation('profile');
  const ngo = page.ngo!;
  const phone = ngo.phone;
  const items = [
    ngo.address && (
      <ContactRow key="address" icon={<PlaceRounded />}>
        <span>{addressLine(ngo.address)}</span>
        <span className="text-fg-muted">
          {page.city} - {page.state} · {maskCep(ngo.address.cep)}
        </span>
        <Link
          href={mapsUrl(ngo.address, page.city, page.state)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1"
        >
          <MapRounded fontSize="inherit" aria-hidden />
          {t('page.openMap')}
        </Link>
      </ContactRow>
    ),
    phone && (
      <ContactRow key="phone" icon={<PhoneRounded />}>
        <span>{maskPhone(phone)}</span>
        <span className="flex flex-wrap gap-3">
          <Link href={`tel:+55${phone}`}>{t('page.call')}</Link>
          <Link
            href={`https://wa.me/55${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <WhatsAppIcon fontSize="inherit" aria-hidden />
            {t('page.whatsapp')}
          </Link>
        </span>
      </ContactRow>
    ),
    ngo.instagram && (
      <ContactRow key="instagram" icon={<InstagramIcon />}>
        <Link href={`https://instagram.com/${ngo.instagram}`} target="_blank" rel="noopener noreferrer">
          @{ngo.instagram}
        </Link>
      </ContactRow>
    ),
    ngo.website && (
      <ContactRow key="website" icon={<LanguageRounded />}>
        <Link href={ngo.website} target="_blank" rel="noopener noreferrer" className="break-all">
          {ngo.website.replace(/^https?:\/\//, '')}
        </Link>
      </ContactRow>
    ),
  ].filter(Boolean);

  return (
    <Paper variant="outlined" className="flex flex-col gap-3 p-4" sx={{ borderRadius: 3 }}>
      <Typography variant="h6" component="h2">
        {t('page.contact')}
      </Typography>
      {items.length ? (
        <ul className="flex flex-col gap-4">{items}</ul>
      ) : (
        <Typography color="text.secondary">{t('page.noContact')}</Typography>
      )}
    </Paper>
  );
}

function DonationTile({ item }: { item: FeedCardItem }) {
  const { t } = useTranslation('common');
  return (
    <li className="animate-fade-up">
      <RouterLink
        to={`/items/${item.id}`}
        className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary-500"
      >
        <img src={item.photos[0]} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
        <span className="flex flex-col gap-1 p-2.5">
          <span className="line-clamp-2 text-sm font-semibold group-hover:underline">{item.title}</span>
          <Badge tone="accent" className="self-start">
            {t(`categories.${item.category}`)}
          </Badge>
        </span>
      </RouterLink>
    </li>
  );
}

/**
 * Doações concluídas (doador) ou recebidas (ONG) em grade de miniaturas (decisão da fase 6).
 * Doador que ocultou: aviso para os outros; para ele mesmo, a lista com a dica de onde mudar.
 */
export function DonationsGrid({ page, self }: { page: UserPageView; self: boolean }) {
  const { t } = useTranslation('profile');
  const { user } = useAuth();
  const donations = useUserDonations(page.id, !page.isPublic);
  const isNgo = page.role === 'NGO';
  const title = isNgo ? t('page.receivedTitle') : t('page.donatedTitle');
  const count = page.donations_count;

  let content;
  if (page.isPublic) {
    content =
      count === null ? (
        <Typography color="text.secondary">{t('page.hiddenDonations')}</Typography>
      ) : (
        <Typography color="text.secondary">{t('page.visitorDonations', { count })}</Typography>
      );
  } else if (donations.isPending) {
    content = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[4/3]" />
        ))}
      </div>
    );
  } else if (donations.data?.hidden) {
    content = <Typography color="text.secondary">{t('page.hiddenDonations')}</Typography>;
  } else if (!donations.data?.items.length) {
    content = (
      <Typography color="text.secondary">{isNgo ? t('page.noDonationsNgo') : t('page.noDonationsDonor')}</Typography>
    );
  } else {
    content = (
      <>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {donations.data.items.map((item) => (
            <DonationTile key={item.id} item={item} />
          ))}
        </ul>
        {donations.hasNextPage && (
          <Button
            variant="secondary"
            className="self-center"
            loading={donations.isFetchingNextPage}
            onClick={() => void donations.fetchNextPage()}
          >
            {t('page.loadMore')}
          </Button>
        )}
      </>
    );
  }

  const shownCount = count ?? (self ? donations.data?.total : undefined);
  return (
    <section aria-labelledby="doacoes-titulo" className="flex flex-col gap-3">
      <Typography id="doacoes-titulo" variant="h6" component="h2">
        {title} {shownCount !== undefined && shownCount !== null && t('page.count', { count: shownCount })}
      </Typography>
      {self && !isNgo && user?.preferences.show_donations === false && (
        <Typography variant="body2" color="text.secondary">
          {t('page.hiddenSelf')}
        </Typography>
      )}
      {content}
    </section>
  );
}
