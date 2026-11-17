import { useLocation, type Location } from 'react-router';

/** `location.state` de quem abriu o item a partir do feed: o desktop mostra o modal sobre ele. */
export interface ItemRouteState {
  background?: Pick<Location, 'pathname' | 'search'>;
}

export interface ItemLink {
  to: string;
  state: ItemRouteState;
}

/** Link para o detalhe guardando o feed atual (com filtros) como fundo. */
export function useItemLink() {
  const location = useLocation();
  return (id: string): ItemLink => ({
    to: `/items/${id}`,
    state: { background: { pathname: location.pathname, search: location.search } } satisfies ItemRouteState,
  });
}
