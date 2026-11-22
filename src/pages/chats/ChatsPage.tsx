import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFillHeight } from '@/core/hooks/useFillHeight';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { ChatList } from '@/features/chat/ChatList';
import { ChatRoom } from '@/features/chat/ChatRoom';

/**
 * Conversas (guia, F9): no desktop, lista e sala lado a lado (a lista fica montada ao trocar de conversa);
 * no celular, lista e sala em telas separadas, com voltar. A altura é medida (header, banners e, no celular,
 * a barra de baixo), para o campo de mensagem ficar sempre à vista.
 */
export default function ChatsPage() {
  const { t } = useTranslation('chat');
  const { itemId } = useParams();
  const isMobile = useIsMobile();
  // Celular: desconta a barra de baixo (72 px).
  const fill = useFillHeight<HTMLDivElement>(isMobile ? 72 : 0);

  if (isMobile) {
    return itemId ? (
      <div ref={fill}>
        <ChatRoom key={itemId} itemId={itemId} showBack />
      </div>
    ) : (
      <ChatList className="flex flex-col bg-surface" />
    );
  }

  return (
    <div ref={fill} className="grid grid-cols-[240px_1fr] lg:grid-cols-[minmax(280px,360px)_1fr]">
      <ChatList activeId={itemId} compact className="flex min-h-0 flex-col border-r border-border bg-surface" />
      <div className="min-h-0">
        {itemId ? (
          <ChatRoom key={itemId} itemId={itemId} />
        ) : (
          <EmptyState illustration="messages" title={t('list.pickTitle')} description={t('list.pickDescription')} />
        )}
      </div>
    </div>
  );
}
