import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { Illustration } from '@/components/ui/Illustration';
import { Modal } from '@/components/ui/Modal';

/** Doação concluída (decisão da fase 9): ilustração e confete leve, só para quem confirmou o recebimento. */
export function CelebrationModal({ open, title, onClose }: { open: boolean; title: string; onClose(): void }) {
  const { t } = useTranslation('chat');
  return (
    <>
      {open && <Confetti />}
      <Modal
        open={open}
        onClose={onClose}
        title={t('celebrate.title')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" to="/donations">
              {t('celebrate.myInterests')}
            </Button>
            <Button onClick={onClose}>{t('celebrate.close')}</Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Illustration name="celebration" className="max-w-56" />
          <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography color="text.secondary">{t('celebrate.text')}</Typography>
        </div>
      </Modal>
    </>
  );
}
