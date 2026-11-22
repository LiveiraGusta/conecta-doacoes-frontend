import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MuiMenu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useId, useState, type ReactNode } from 'react';
import { Link } from 'react-router';

export type MenuItem =
  | { kind: 'link'; label: string; to: string; icon?: ReactNode }
  | { kind: 'action'; label: string; onSelect(): void; icon?: ReactNode; danger?: boolean };

export interface MenuProps {
  /** Conteúdo do botão que abre o menu (ex.: avatar + nome). */
  trigger: ReactNode;
  /** Nome acessível do botão. */
  label: string;
  items: MenuItem[];
  align?: 'start' | 'end';
  triggerClassName?: string;
}

/**
 * Menu suspenso (Menu do MUI): abre no clique; Esc, clique fora e escolha fecham; setas navegam;
 * o foco volta ao botão ao fechar.
 */
export function Menu({ trigger, label, items, align = 'end', triggerClassName }: MenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const open = Boolean(anchor);
  const close = () => setAnchor(null);
  const horizontal = align === 'end' ? 'right' : 'left';

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      <MuiMenu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal }}
        transformOrigin={{ vertical: 'top', horizontal }}
        slotProps={{ list: { 'aria-label': label } }}
      >
        {items.map((item) =>
          item.kind === 'link' ? (
            <MenuItem key={item.label} component={Link} to={item.to} onClick={close}>
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          ) : (
            <MenuItem
              key={item.label}
              onClick={() => {
                close();
                item.onSelect();
              }}
              sx={item.danger ? { color: 'error.main', '& .MuiListItemIcon-root': { color: 'error.main' } } : undefined}
            >
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          ),
        )}
      </MuiMenu>
    </>
  );
}
