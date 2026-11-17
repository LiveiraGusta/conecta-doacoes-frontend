import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import type { Message } from '@/core/types/api';
import { cn } from '@/core/utils/cn';
import { dayLabel, formatTime } from '@/core/utils/format';

/** Mensagem que ainda não voltou do servidor (envio otimista, decisão da fase 5). */
export interface PendingMessage {
  key: string;
  text: string;
  status: 'sending' | 'failed';
  createdAt: string;
}

/** Perto do fim (em px): mensagem nova rola sozinha; mais acima, aparece "Novas mensagens". */
const NEAR_BOTTOM = 120;

function Bubble({
  mine,
  animate = false,
  children,
  footer,
}: {
  mine: boolean;
  /** Mensagem que chegou com a conversa aberta: entra deslizando do seu lado (fase 9). */
  animate?: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <li
      className={cn(
        'flex',
        mine ? 'justify-end' : 'justify-start',
        animate && (mine ? 'animate-msg-in-right' : 'animate-msg-in-left'),
      )}
    >
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-0.5 rounded-2xl px-3.5 py-2 shadow-sm',
          mine ? 'rounded-br-md bg-primary text-on-primary' : 'rounded-bl-md bg-surface text-fg',
        )}
      >
        <p className="text-[0.95rem] break-words whitespace-pre-wrap">{children}</p>
        <span
          className={cn('flex items-center justify-end gap-1 text-[0.7rem]', mine ? 'text-white/80' : 'text-fg-muted')}
        >
          {footer}
        </span>
      </div>
    </li>
  );
}

/**
 * Mensagens da sala: separador por dia ("Hoje", "Ontem", data), balões (as minhas à direita),
 * pendentes com "Enviando…" ou "Não enviada · Tentar de novo". `role="log"` anuncia as novas.
 */
export function MessageList({
  messages,
  pending,
  myId,
  onRetry,
  onDiscard,
  empty,
}: {
  messages: Message[];
  pending: PendingMessage[];
  myId: string;
  onRetry(key: string): void;
  onDiscard(key: string): void;
  empty?: ReactNode;
}) {
  const { t } = useTranslation('chat');
  const box = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const seen = useRef(0);
  const [newBelow, setNewBelow] = useState(false);
  // O que já estava na tela ao abrir não anima; só o que chega depois.
  const [initialIds] = useState(() => new Set(messages.map((m) => m.id)));

  const total = messages.length + pending.length;
  const lastMine = pending.length > 0 || messages.at(-1)?.sender_id === myId;

  // Mensagem nova: rola até o fim se já estava lá (ou se fui eu que mandei); senão, mostra o atalho.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const first = seen.current === 0;
    if (total > seen.current) {
      if (first || nearBottom.current || lastMine) {
        el.scrollTop = el.scrollHeight;
        setNewBelow(false);
      } else setNewBelow(true);
    }
    seen.current = total;
  }, [total, lastMine]);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM;
    if (nearBottom.current) setNewBelow(false);
  };

  const day = (iso: string) => {
    const label = dayLabel(iso);
    return label === 'today' ? t('room.today') : label === 'yesterday' ? t('room.yesterday') : label;
  };

  // Dia de cada linha, calculado antes do JSX: o separador aparece quando o dia muda.
  const rows = [
    ...messages.map((m) => ({ key: m.id, at: m.created_at, message: m, pending: null })),
    ...pending.map((p) => ({ key: p.key, at: p.createdAt, message: null, pending: p })),
  ].map((row, i, all) => ({ ...row, dayLabel: i === 0 || day(all[i - 1]!.at) !== day(row.at) ? day(row.at) : null }));

  const separator = (label: string | null) =>
    label && (
      <li className="flex justify-center py-2" aria-hidden>
        <Chip label={label} size="small" sx={{ bgcolor: 'background.paper' }} />
      </li>
    );

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={box} onScroll={onScroll} className="h-full overflow-y-auto bg-surface-alt px-3 py-4 md:px-6">
        {total === 0 && empty}
        <div role="log" aria-live="polite" aria-label={t('room.messages')}>
          <ol className="flex flex-col gap-1.5">
            {rows.map(({ key, dayLabel: label, message: m, pending: p }) => (
              <Fragment key={key}>
                {separator(label)}
                {m ? (
                  <Bubble
                    mine={m.sender_id === myId}
                    // As minhas já apareceram como pendentes: não deslizam de novo.
                    animate={!initialIds.has(m.id) && m.sender_id !== myId}
                    footer={<time dateTime={m.created_at}>{formatTime(m.created_at)}</time>}
                  >
                    {m.message}
                  </Bubble>
                ) : (
                  <Bubble
                    mine
                    animate
                    footer={
                      p!.status === 'sending' ? (
                        <>
                          <ScheduleRounded sx={{ fontSize: 12 }} className="animate-pulse" aria-hidden />
                          {t('room.sending')}
                        </>
                      ) : (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <ErrorOutlineRounded sx={{ fontSize: 14 }} aria-hidden />
                          <span>{t('room.failed')}</span>
                          <Link
                            component="button"
                            type="button"
                            color="inherit"
                            onClick={() => onRetry(key)}
                            sx={{ fontWeight: 700 }}
                          >
                            {t('room.retry')}
                          </Link>
                          ·
                          <Link component="button" type="button" color="inherit" onClick={() => onDiscard(key)}>
                            {t('room.discard')}
                          </Link>
                        </span>
                      )
                    }
                  >
                    {p!.text}
                  </Bubble>
                )}
              </Fragment>
            ))}
          </ol>
        </div>
      </div>
      {newBelow && (
        <Button
          size="sm"
          icon={<ArrowDownwardRounded />}
          className="!absolute bottom-3 left-1/2 -translate-x-1/2 shadow-md"
          onClick={() => {
            const el = box.current;
            if (el) el.scrollTop = el.scrollHeight;
            setNewBelow(false);
          }}
        >
          {t('room.newMessages')}
        </Button>
      )}
    </div>
  );
}
