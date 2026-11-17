import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { cn } from '@/core/utils/cn';

/**
 * Bloco do perfil (decisão da fase 6: cada seção salva sozinha). Título, descrição, campos e,
 * no rodapé, o botão da seção.
 */
export function SectionCard({
  id,
  title,
  description,
  children,
  footer,
  danger = false,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  danger?: boolean;
  className?: string;
}) {
  const headingId = id ? `${id}-titulo` : undefined;
  return (
    <Paper
      component="section"
      id={id}
      aria-labelledby={headingId}
      variant="outlined"
      className={cn('flex scroll-mt-6 flex-col gap-4 p-4 md:p-6', className)}
      sx={{ borderRadius: 3, ...(danger && { borderColor: 'error.main' }) }}
    >
      <div className="flex flex-col gap-1">
        <Typography id={headingId} variant="h6" component="h2" color={danger ? 'error' : undefined}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </div>
      {children}
      {footer && <div className="flex flex-wrap justify-end gap-2">{footer}</div>}
    </Paper>
  );
}
