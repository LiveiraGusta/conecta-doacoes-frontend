import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import BlockRounded from '@mui/icons-material/BlockRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { LoadingRegion, Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/core/api/http';
import { useAuth } from '@/core/auth/useAuth';
import { useSnackbar } from '@/core/feedback/useSnackbar';
import { addMessageToCache, chatKey, markRoomRead, useChatRoom, type ChatRoomView } from '@/core/hooks/useChats';
import { useRealtime } from '@/core/realtime/realtimeContext';
import { cancelNegotiation, confirmReceipt, reportChat, sendMessage } from '@/core/services/chats';
import { CancelDialog, ReportDialog } from './ChatDialogs';
import { Composer } from './Composer';
import { MessageList, type PendingMessage } from './MessageList';

let pendingSeq = 0;
const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

type Dialog = 'confirm' | 'cancel' | 'report' | null;

/**
 * Sala da conversa (guia, F9–F11). Histórico pelo REST, novidades pelo WebSocket (ou polling de 3 s),
 * envio otimista, lida ao abrir e a cada mensagem com a aba visível. Ações: a ONG escolhida confirma o
 * recebimento (botão no topo); cancelar e denunciar ficam no menu ⋮ (decisões da fase 5).
 */
export function ChatRoom({ itemId, showBack = false }: { itemId: string; showBack?: boolean }) {
  const { t } = useTranslation(['chat', 'common']);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const snackbar = useSnackbar();
  const navigate = useNavigate();
  const realtime = useRealtime();
  const room = useChatRoom(itemId);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Sala aberta: inscreve no WebSocket e não avisa as mensagens dela.
  const { subscribe, unsubscribe, setActiveRoom } = realtime;
  useEffect(() => {
    subscribe(itemId);
    setActiveRoom(itemId);
    return () => {
      setActiveRoom(null);
      unsubscribe(itemId);
    };
  }, [itemId, subscribe, unsubscribe, setActiveRoom]);

  // Marca como lida ao abrir (uma vez por sala, quando o histórico chega).
  const readFor = useRef<string | null>(null);
  const loaded = Boolean(room.data);
  useEffect(() => {
    if (!loaded || readFor.current === itemId) return;
    readFor.current = itemId;
    void markRoomRead(queryClient, itemId);
  }, [loaded, itemId, queryClient]);

  // Outra sala: descarta pendentes e diálogos (ajuste durante o render).
  const [roomId, setRoomId] = useState(itemId);
  if (roomId !== itemId) {
    setRoomId(itemId);
    setPending([]);
    setDialog(null);
  }

  const send = (text: string, key = `p-${++pendingSeq}`) => {
    setPending((list) => [
      ...list.filter((p) => p.key !== key),
      { key, text, status: 'sending', createdAt: new Date().toISOString() },
    ]);
    sendMessage(itemId, text)
      .then((message) => {
        addMessageToCache(queryClient, message);
        setPending((list) => list.filter((p) => p.key !== key));
        void queryClient.invalidateQueries({ queryKey: ['chats'] });
      })
      .catch((error: unknown) => {
        setPending((list) => list.map((p) => (p.key === key ? { ...p, status: 'failed' } : p)));
        snackbar.show({ message: errorText(error, t('room.failed')), variant: 'error' });
        if (error instanceof ApiError && error.code === 'CHAT_CLOSED') void room.refetch();
      });
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setDialogError(null);
    try {
      await action();
      setDialog(null);
    } catch (error) {
      setDialogError(errorText(error, t('common:system.errorTitle')));
    } finally {
      setBusy(false);
    }
  };

  const refreshLists = () => {
    for (const key of [['chats'], ['myItems'], ['item'], ['feed'], ['interests']]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const confirm = () =>
    run(async () => {
      await confirmReceipt(itemId);
      queryClient.setQueryData<ChatRoomView>(
        chatKey(itemId),
        (r) => r && { ...r, item: { ...r.item, status: 'DOADO' } },
      );
      refreshLists();
      snackbar.show({ message: t('confirm.done'), variant: 'success' });
    });

  const cancel = (reason: string) =>
    run(async () => {
      const result = await cancelNegotiation(itemId, reason || undefined);
      queryClient.setQueryData<ChatRoomView>(chatKey(itemId), (r) => r && { ...r, closed: true });
      refreshLists();
      snackbar.show({ message: result.message, variant: 'info' });
      navigate(user?.role === 'DONOR' ? `/donations/${itemId}/interests` : '/chats');
    });

  const report = (reason: string) =>
    run(async () => {
      await reportChat(itemId, reason);
      snackbar.show({ message: t('report.done'), variant: 'success' });
    });

  const back = showBack && (
    <IconButton label={t('room.back')} onClick={() => navigate('/chats')}>
      <ArrowBackRounded />
    </IconButton>
  );

  if (room.isPending) {
    return (
      <LoadingRegion label={t('room.loading')} className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border p-3">
          {back}
          <Skeleton circle className="size-10" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 bg-surface-alt p-6">
          <Skeleton className="h-10 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          <Skeleton className="h-10 w-3/5 rounded-2xl" />
        </div>
      </LoadingRegion>
    );
  }

  if (!room.data) {
    const closed = room.error instanceof ApiError && room.error.code === 'CHAT_CLOSED';
    return (
      <div className="flex h-full flex-col">
        {back && <div className="border-b border-border p-2">{back}</div>}
        <EmptyState
          illustration={closed ? 'empty' : 'notFound'}
          title={closed ? t('room.closedTitle') : t('room.notFoundTitle')}
          description={closed ? t('room.closedDescription') : t('room.notFoundDescription')}
          action={
            <Button to="/chats" variant="secondary">
              {t('room.back')}
            </Button>
          }
        />
      </div>
    );
  }

  const { item, counterpart, messages, closed } = room.data;
  const donated = item.status === 'DOADO';
  const open = !closed && !donated;
  const isSelectedNgo = user?.role === 'NGO' && item.selected_ngo_id === user.id;

  const menuItems: MenuItem[] = [
    { kind: 'link', label: t('room.viewItem'), to: `/items/${item.id}`, icon: <OpenInNewRounded fontSize="small" /> },
    ...(!closed
      ? [
          {
            kind: 'action' as const,
            label: t('report.button'),
            icon: <FlagRounded fontSize="small" />,
            onSelect: () => setDialog('report'),
          },
        ]
      : []),
    ...(open
      ? [
          {
            kind: 'action' as const,
            label: t('cancel.button'),
            icon: <BlockRounded fontSize="small" />,
            danger: true,
            onSelect: () => setDialog('cancel'),
          },
        ]
      : []),
  ];

  return (
    <section className="flex h-full min-h-0 flex-col" aria-labelledby="room-title">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-3 py-2 md:px-4">
        {back}
        <Avatar name={counterpart.name} seed={counterpart.id} src={counterpart.avatar_url} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Typography id="room-title" component="h2" noWrap sx={{ fontWeight: 700 }}>
            <Link component={RouterLink} to={`/u/${counterpart.id}`} color="inherit" underline="hover">
              {counterpart.name}
            </Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {t('room.about', { title: item.title })}
          </Typography>
        </div>
        {isSelectedNgo && open && (
          <Button
            size="sm"
            icon={<TaskAltRounded />}
            onClick={() => setDialog('confirm')}
            className="order-last w-full sm:order-none sm:w-auto"
          >
            {t('confirm.button')}
          </Button>
        )}
        <Menu
          label={t('room.more')}
          items={menuItems}
          trigger={<MoreVertRounded />}
          triggerClassName="flex size-10 items-center justify-center rounded-full hover:bg-surface-alt"
        />
      </header>

      {open && !realtime.connected && realtime.status === 'closed' && (
        <Alert severity="info" variant="outlined" className="m-2" sx={{ py: 0 }}>
          {t('room.offline')}
        </Alert>
      )}

      <MessageList
        messages={messages}
        pending={pending}
        myId={user?.id ?? ''}
        onRetry={(key) => {
          const p = pending.find((x) => x.key === key);
          if (p) send(p.text, key);
        }}
        onDiscard={(key) => setPending((list) => list.filter((p) => p.key !== key))}
        empty={
          open && (
            <Typography color="text.secondary" className="py-6 text-center">
              {t('room.startHint')}
            </Typography>
          )
        }
      />

      {open ? (
        <Composer counterpart={counterpart.name} onSend={(text) => send(text)} />
      ) : (
        <Alert
          severity={donated ? 'success' : 'warning'}
          square
          action={
            closed && user?.role === 'DONOR' ? (
              <Button to={`/donations/${item.id}/interests`} size="sm" variant="ghost">
                {t('room.closedDonor')}
              </Button>
            ) : undefined
          }
        >
          {donated ? t('room.donated') : t('room.closed')}
        </Alert>
      )}

      <ConfirmDialog
        open={dialog === 'confirm'}
        title={t('confirm.title', { title: item.title })}
        confirmLabel={t('confirm.confirm')}
        loading={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setDialog(null)}
      >
        {dialogError ?? t('confirm.text')}
      </ConfirmDialog>
      <CancelDialog
        key={`cancel-${dialog === 'cancel'}`}
        open={dialog === 'cancel'}
        loading={busy}
        error={dialogError}
        onConfirm={(reason) => void cancel(reason)}
        onClose={() => setDialog(null)}
        onReportFirst={() => {
          setDialogError(null);
          setDialog('report');
        }}
      />
      <ReportDialog
        key={`report-${dialog === 'report'}`}
        open={dialog === 'report'}
        name={counterpart.name}
        loading={busy}
        error={dialogError}
        onSubmit={(reason) => void report(reason)}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}
