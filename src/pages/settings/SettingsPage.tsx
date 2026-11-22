import CheckRounded from '@mui/icons-material/CheckRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import SettingsBrightnessRounded from '@mui/icons-material/SettingsBrightnessRounded';
import FormControlLabel from '@mui/material/FormControlLabel';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { useLocalStorage } from '@/core/hooks/useLocalStorage';
import { ME_KEY } from '@/core/services/auth';
import { updatePreferences } from '@/core/services/profile';
import { PALETTES } from '@/core/theme/palettes';
import { THEME_COLORS, THEME_MODES } from '@/core/theme/theme';
import { useTheme } from '@/core/theme/useTheme';
import type { Preferences, ThemeMode, User } from '@/core/types/api';
import { CHAT_NOTIFY_KEY, CHAT_SOUND_KEY } from '@/core/utils/chatPrefs';
import { cn } from '@/core/utils/cn';
import { SectionCard } from '@/features/profile/SectionCard';

const MODE_ICONS: Record<ThemeMode, typeof LightModeRounded> = {
  LIGHT: LightModeRounded,
  DARK: DarkModeRounded,
  SYSTEM: SettingsBrightnessRounded,
};

/**
 * Preferências salvas no backend (vale em todos os aparelhos): muda na hora, grava depois; se a API
 * recusar, volta ao que era. O tema também vai para o `user.preferences` da sessão.
 */
function usePreferences() {
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const theme = useTheme();
  const { t } = useTranslation('profile');

  const setPrefs = (prefs: Partial<Preferences>) =>
    queryClient.setQueryData<User | null>(ME_KEY, (u) => u && { ...u, preferences: { ...u.preferences, ...prefs } });

  return useMutation({
    mutationFn: updatePreferences,
    onMutate: (patch) => {
      const before = queryClient.getQueryData<User | null>(ME_KEY)?.preferences;
      const themeBefore = { color: theme.color, mode: theme.mode };
      if (patch.theme_color) theme.setColor(patch.theme_color);
      if (patch.theme_mode) theme.setMode(patch.theme_mode);
      setPrefs(patch);
      return { before, themeBefore };
    },
    onError: (_e, _patch, ctx) => {
      if (ctx?.before) setPrefs(ctx.before);
      if (ctx) theme.setTheme(ctx.themeBefore);
      snackbar.show({ message: t('settings.saveError'), variant: 'error' });
    },
    onSuccess: (prefs) => setPrefs(prefs),
  });
}

/** Configurações (plano, "/settings"): aparência, privacidade (doador), mensagens e atalhos. */
export default function SettingsPage() {
  const { t } = useTranslation(['profile', 'common']);
  const { user } = useAuth();
  const theme = useTheme();
  const prefs = usePreferences();
  const [sound, setSound] = useLocalStorage(CHAT_SOUND_KEY, true);
  const [notify, setNotify] = useLocalStorage(CHAT_NOTIFY_KEY, true);
  if (!user) return null;
  const chatUser = user.role === 'DONOR' || user.role === 'NGO';

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 md:px-8 md:py-8 lg:grid-cols-2">
      <SectionCard
        id="aparencia"
        title={t('settings.appearance')}
        description={t('settings.appearanceDescription')}
        className="lg:row-span-2"
      >
        <div className="flex flex-col gap-2">
          <Typography id="cor-tema" variant="subtitle2" component="h3">
            {t('settings.color')}
          </Typography>
          <div role="radiogroup" aria-labelledby="cor-tema" className="flex flex-wrap gap-3">
            {THEME_COLORS.map((color) => {
              const selected = theme.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t(`common:theme.colors.${color}`)}
                  onClick={() => !selected && prefs.mutate({ theme_color: color })}
                  className={cn(
                    'flex size-12 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition-shadow focus-visible:ring-4 focus-visible:ring-primary-300 focus-visible:outline-none',
                    selected && 'ring-4 ring-fg/60',
                  )}
                  style={{ backgroundColor: PALETTES[color][600] }}
                >
                  {selected && <CheckRounded aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Typography id="modo-tema" variant="subtitle2" component="h3">
            {t('settings.mode')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={theme.mode}
            onChange={(_, mode: ThemeMode | null) => mode && prefs.mutate({ theme_mode: mode })}
            aria-labelledby="modo-tema"
            size="small"
            className="flex-wrap"
          >
            {THEME_MODES.map((mode) => {
              const Icon = MODE_ICONS[mode];
              return (
                <ToggleButton key={mode} value={mode} className="gap-1.5 px-3 sm:px-4">
                  <Icon fontSize="small" aria-hidden />
                  {t(`common:theme.modes.${mode}`)}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </div>
        <div className="flex flex-col gap-2" aria-hidden>
          <Typography variant="subtitle2" component="h3">
            {t('settings.preview')}
          </Typography>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="flex flex-col gap-1">
              <Typography sx={{ fontWeight: 700 }}>{t('settings.previewCard')}</Typography>
              <Badge tone="accent">{t('common:categories.ROUPAS')}</Badge>
            </div>
            <Button size="sm" icon={<FavoriteBorderRounded />} tabIndex={-1}>
              {t('settings.previewButton')}
            </Button>
          </div>
        </div>
      </SectionCard>

      {user.role === 'DONOR' && (
        <SectionCard id="privacidade" title={t('settings.privacy')}>
          <FormControlLabel
            control={
              <Switch
                checked={user.preferences.show_donations}
                onChange={(e) => prefs.mutate({ show_donations: e.target.checked })}
              />
            }
            label={t('settings.showDonations')}
          />
          <Typography variant="body2" color="text.secondary">
            {t('settings.showDonationsHint')}
          </Typography>
        </SectionCard>
      )}

      {chatUser && (
        <SectionCard
          id="mensagens"
          title={t('settings.notifications')}
          description={t('settings.notificationsDescription')}
        >
          <FormControlLabel
            control={<Switch checked={sound} onChange={(e) => setSound(e.target.checked)} />}
            label={t('settings.sound')}
          />
          <FormControlLabel
            control={<Switch checked={notify} onChange={(e) => setNotify(e.target.checked)} />}
            label={t('settings.notify')}
          />
        </SectionCard>
      )}

      {chatUser && (
        <SectionCard id="atalhos" title={t('settings.shortcuts')}>
          <List disablePadding className="-mx-2">
            {[
              { to: `/u/${user.id}`, label: t('settings.myPage') },
              { to: '/profile', label: t('settings.editProfile') },
              { to: '/profile?aba=conta#senha', label: t('settings.changePassword') },
            ].map((link) => (
              <li key={link.to}>
                <ListItemButton component={RouterLink} to={link.to} className="rounded-lg">
                  <ListItemText primary={link.label} />
                  <ChevronRightRounded aria-hidden className="text-fg-muted" />
                </ListItemButton>
              </li>
            ))}
          </List>
        </SectionCard>
      )}
    </section>
  );
}
