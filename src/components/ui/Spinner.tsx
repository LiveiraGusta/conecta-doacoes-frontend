import CircularProgress from '@mui/material/CircularProgress';

/** Indicador de carregamento. Spinner só dentro de botões; telas usam Skeleton (decisão do plano). */
export function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <CircularProgress
      size={size}
      color="inherit"
      aria-label={label}
      aria-hidden={label ? undefined : true}
      role={label ? 'progressbar' : undefined}
    />
  );
}
