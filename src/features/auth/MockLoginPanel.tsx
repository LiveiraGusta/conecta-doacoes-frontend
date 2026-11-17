import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { login } from '@/core/services/auth';
import { db, IDS, MOCK_PASSWORD } from '@/mocks/db';
import { useCompleteAuth } from './useCompleteAuth';

const ACCOUNTS = [
  { key: 'donor', id: IDS.donor },
  { key: 'ngoActive', id: IDS.ngoActive },
  { key: 'ngoPending', id: IDS.ngoPending },
  { key: 'ngoRejected', id: IDS.ngoRejected },
  { key: 'admin', id: IDS.admin },
] as const;

/**
 * "Entrar como" do `npm run dev:mock` (plano, "Dados mockados"). Só é carregado com VITE_USE_MOCKS=true
 * (import dinâmico na LoginPage), então os dados falsos não entram no bundle de produção.
 */
export default function MockLoginPanel() {
  const { t } = useTranslation('auth');
  const complete = useCompleteAuth();
  const mutation = useMutation({ mutationFn: login, onSuccess: (user) => complete(user) });

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-labelledby="mock-login"
      className="border-dashed p-4"
      sx={{ borderColor: 'secondary.main', borderWidth: 2 }}
    >
      <Typography id="mock-login" variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        {t('mock.title')}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t('mock.description', { password: MOCK_PASSWORD })}
      </Typography>
      <List dense>
        {ACCOUNTS.map(({ key, id }) => {
          const user = db.state.users.get(id)!.user;
          return (
            <ListItemButton
              key={key}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ email: user.email, password: MOCK_PASSWORD })}
              sx={{ borderRadius: 2 }}
            >
              <ListItemAvatar>
                <Avatar name={user.name} seed={user.id} size="sm" />
              </ListItemAvatar>
              <ListItemText primary={t(`mock.accounts.${key}`)} secondary={user.email} />
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
