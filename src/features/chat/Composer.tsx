import SendRounded from '@mui/icons-material/SendRounded';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/Button';
import { useIsMobile } from '@/core/hooks/useMediaQuery';

const MAX_MESSAGE = 2000;

/**
 * Campo de mensagem (decisão da fase 5): no desktop Enter envia e Shift+Enter quebra linha;
 * no celular Enter quebra linha e o botão envia. Respeita a composição de acentos (IME).
 */
export function Composer({ counterpart, onSend }: { counterpart: string; onSend(text: string): void }) {
  const { t } = useTranslation('chat');
  const isMobile = useIsMobile();
  const [text, setText] = useState('');
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-border bg-surface px-3 py-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <InputBase
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.shiftKey || isMobile || e.nativeEvent.isComposing) return;
            e.preventDefault();
            submit();
          }}
          multiline
          maxRows={5}
          placeholder={t('room.placeholder')}
          inputProps={{
            'aria-label': t('room.inputLabel', { name: counterpart }),
            maxLength: MAX_MESSAGE,
            enterKeyHint: isMobile ? 'enter' : 'send',
          }}
          className="rounded-3xl bg-surface-alt px-4 py-2"
        />
        {text.length > MAX_MESSAGE - 200 && (
          <Typography variant="caption" color="text.secondary" className="self-end px-2">
            {t('room.counter', { count: text.length })}
          </Typography>
        )}
      </div>
      <IconButton label={t('room.send')} type="submit" color="primary" disabled={!trimmed}>
        <SendRounded />
      </IconButton>
    </form>
  );
}
