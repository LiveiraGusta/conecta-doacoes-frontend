import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import type { Category } from '@/core/types/api';
import { cn } from '@/core/utils/cn';
import { CATEGORY_OPTIONS, type CategoryOption } from './categories';

export interface CategoryBarProps {
  value: Category | null;
  onChange(value: Category | null): void;
}

function useLabel() {
  const { t } = useTranslation(['feed', 'common']);
  return (o: CategoryOption) => (o.value ? t(`common:categories.${o.value}`) : t('feed:categories.all'));
}

/** Desktop (design-desktop-feed): faixa "Categorias" com ícones grandes; a escolhida fica sublinhada. */
export function CategoryBarDesktop({ value, onChange }: CategoryBarProps) {
  const { t } = useTranslation('feed');
  const label = useLabel();
  return (
    <Paper square elevation={0} className="flex flex-wrap items-center gap-x-10 gap-y-4 px-10 py-6">
      <Typography variant="h5" component="h2" className="mr-auto">
        {t('categories.title')}
      </Typography>
      <div role="group" aria-label={t('categories.label')} className="flex flex-wrap gap-4">
        {CATEGORY_OPTIONS.map((o) => {
          const active = o.value === value;
          return (
            <ButtonBase
              key={o.value ?? 'all'}
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className="flex w-24 flex-col items-center gap-1 rounded-xl px-2 py-2"
              sx={{ color: 'primary.main', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <o.icon aria-hidden sx={{ fontSize: 48 }} />
              <span className={cn('text-base', active && 'font-bold underline underline-offset-4')}>{label(o)}</span>
            </ButtonBase>
          );
        })}
      </div>
    </Paper>
  );
}

/** Mobile: chips em uma linha que rola para o lado. */
export function CategoryBarMobile({ value, onChange }: CategoryBarProps) {
  const { t } = useTranslation('feed');
  const label = useLabel();
  return (
    <div
      role="group"
      aria-label={t('categories.label')}
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1"
    >
      {CATEGORY_OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <Chip
            key={o.value ?? 'all'}
            icon={<o.icon aria-hidden />}
            label={label(o)}
            aria-pressed={active}
            clickable
            onClick={() => onChange(o.value)}
            color={active ? 'primary' : 'default'}
            variant={active ? 'filled' : 'outlined'}
            sx={{ bgcolor: active ? undefined : 'background.paper' }}
          />
        );
      })}
    </div>
  );
}

export function CategoryBar(props: CategoryBarProps) {
  return useIsMobile() ? <CategoryBarMobile {...props} /> : <CategoryBarDesktop {...props} />;
}
