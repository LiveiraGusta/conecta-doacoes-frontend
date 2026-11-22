import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { NewItemForm } from '@/features/donations/NewItemForm';

/** Publicar doação (só doador; o guard da rota cuida do resto). */
export default function NewItemPage() {
  const { t } = useTranslation('donations');
  return (
    <section
      className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-8 md:py-8"
      aria-labelledby="new-title"
    >
      <Typography id="new-title" variant="h4" component="h2" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
        {t('new.title')}
      </Typography>
      <NewItemForm />
    </section>
  );
}
