import ListItemButton from '@mui/material/ListItemButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { CountBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/core/auth/useAuth';
import { useChats } from '@/core/hooks/useChats';
import type { ChatStatus } from '@/core/services/chats';
import type { ChatSummary } from '@/core/types/api';
import { relativeTime } from '@/core/utils/format';

const TABS: ChatStatus[] = ['EM_PROGRESSO', 'DOADO'];

function ChatRow({ chat, active }: { chat: ChatSummary; active: boolean }) {
  const { t } = useTranslation('chat');
  const { user } = useAuth();
  const last = chat.last_message;
  const preview = last
    ? last.sender_id === user?.id
      ? t('list.you', { text: last.message })
      : last.message
    : t('list.noMessages');
  const unread = chat.unread_count > 0;

  return (
    <li>
      <ListItemButton
        component={RouterLink}
        to={`/chats/${chat.item_id}`}
        selected={active}
        aria-current={active ? 'page' : undefined}
        className="flex items-start gap-3 px-4 py-3"
      >
        <span className="relative shrink-0">
          <Avatar name={chat.counterpart.name} seed={chat.counterpart.id} src={chat.counterpart.avatar_url} />
          {chat.item_photo && (
            <img
              src={chat.item_photo}
              alt=""
              className="absolute -right-1.5 -bottom-1.5 size-6 rounded-md border-2 border-surface object-cover"
            />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-baseline justify-between gap-2">
            <Typography component="span" noWrap sx={{ fontWeight: unread ? 800 : 600 }}>
              {chat.counterpart.name}
            </Typography>
            {last?.created_at && (
              <Typography component="time" dateTime={last.created_at} variant="caption" color="text.secondary" noWrap>
                {relativeTime(last.created_at)}
              </Typography>
            )}
          </span>
          <Typography component="span" variant="caption" color="primary" noWrap sx={{ fontWeight: 600 }}>
            {chat.item_title}
          </Typography>
          <span className="flex items-center justify-between gap-2">
            <Typography
              component="span"
              variant="body2"
              color={unread ? 'text.primary' : 'text.secondary'}
              noWrap
              sx={{ fontWeight: unread ? 600 : 400 }}
            >
              {preview}
            </Typography>
            <CountBadge count={chat.unread_count} label={t('list.unread', { count: chat.unread_count })} />
          </span>
        </span>
      </ListItemButton>
    </li>
  );
}

/**
 * Lista de conversas (guia, F9): abas Em andamento / Concluídas, por atividade mais recente,
 * com a outra parte, o item, a última mensagem e as não lidas. No desktop fica ao lado da sala.
 */
export function ChatList({
  activeId,
  compact = false,
  className,
}: {
  activeId?: string;
  /** Coluna estreita do desktop: estado vazio só com texto (a ilustração fica no painel da sala). */
  compact?: boolean;
  className?: string;
}) {
  const { t } = useTranslation(['chat', 'common']);
  const { user } = useAuth();
  const [tab, setTab] = useState<ChatStatus>('EM_PROGRESSO');
  const chats = useChats(tab);
  const list = chats.data?.data ?? [];

  let content;
  if (chats.isPending) {
    content = (
      <LoadingRegion label={t('list.loading')} className="flex flex-col">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton circle className="size-10" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </LoadingRegion>
    );
  } else if (chats.isError) {
    content = (
      <EmptyState
        illustration="error"
        title={t('list.errorTitle')}
        action={<Button onClick={() => void chats.refetch()}>{t('common:actions.retry')}</Button>}
      />
    );
  } else if (list.length === 0) {
    const description =
      tab === 'DOADO' ? t('list.emptyDone') : user?.role === 'NGO' ? t('list.emptyNgo') : t('list.emptyDonor');
    content = compact ? (
      <div className="flex flex-col gap-1 px-6 py-10 text-center">
        <Typography component="h3" sx={{ fontWeight: 700 }}>
          {t('list.emptyTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </div>
    ) : (
      <EmptyState illustration="messages" title={t('list.emptyTitle')} description={description} />
    );
  } else {
    content = (
      <ul aria-label={t('list.title')} className="flex flex-col divide-y divide-border">
        {list.map((chat) => (
          <ChatRow key={chat.item_id} chat={chat} active={chat.item_id === activeId} />
        ))}
      </ul>
    );
  }

  return (
    <div className={className}>
      <Tabs
        value={tab}
        onChange={(_, v: ChatStatus) => setTab(v)}
        variant="fullWidth"
        aria-label={t('list.tabs')}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((s) => (
          <Tab key={s} value={s} label={s === 'DOADO' ? t('list.done') : t('list.active')} />
        ))}
      </Tabs>
      <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
    </div>
  );
}
