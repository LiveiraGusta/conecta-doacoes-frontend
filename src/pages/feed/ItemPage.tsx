import { useLocation, useNavigate, useParams } from 'react-router';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { ItemDetailModal, ItemDetailPage } from '@/features/feed/ItemDetail';
import type { ItemRouteState } from '@/features/feed/itemLink';
import { FeedView } from './FeedPage';

/**
 * `/items/:itemId` (decisão do plano): no desktop, vindo do feed, é um modal sobre o feed (com os mesmos
 * filtros, guardados em `location.state.background`); no mobile, ou com o link aberto direto, é uma página.
 */
export default function ItemPage() {
  const { itemId = '' } = useParams();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const background = (location.state as ItemRouteState | null)?.background;

  // Voltar: se viemos de dentro do app, o histórico tem o feed; senão (link direto), vai para ele.
  const back = () => {
    if (location.key !== 'default') void navigate(-1);
    else void navigate(background ? background.pathname + background.search : '/feed');
  };

  if (!isMobile && background) {
    return (
      <>
        <FeedView source={background.search} />
        <ItemDetailModal id={itemId} onClose={back} />
      </>
    );
  }
  return <ItemDetailPage id={itemId} mobile={isMobile} onBack={back} />;
}
