import AppsRounded from '@mui/icons-material/AppsRounded';
import CheckroomRounded from '@mui/icons-material/CheckroomRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import SportsEsportsRounded from '@mui/icons-material/SportsEsportsRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Category } from '@/core/types/api';

export interface CategoryOption {
  /** `null` = Todos. */
  value: Category | null;
  icon: SvgIconComponent;
}

/** Barra de categorias do design (+ Livros, que existe na API). Ícones do plano. */
export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: null, icon: AppsRounded },
  { value: 'ROUPAS', icon: CheckroomRounded },
  { value: 'ALIMENTOS', icon: RestaurantRounded },
  { value: 'BRINQUEDOS', icon: SportsEsportsRounded },
  { value: 'LIVROS', icon: MenuBookRounded },
];

export const CATEGORIES = CATEGORY_OPTIONS.flatMap((o) => (o.value ? [o.value] : []));
