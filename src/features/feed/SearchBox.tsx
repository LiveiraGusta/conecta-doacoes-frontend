import CloseRounded from '@mui/icons-material/CloseRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import InputBase from '@mui/material/InputBase';
import Paper from '@mui/material/Paper';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/core/utils/cn';

/** Espera entre a última tecla e a busca (decisão da fase 3). */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Busca do feed: campo em pílula como no design. Guarda o rascunho e só manda para a URL depois de
 * {@link SEARCH_DEBOUNCE_MS} sem digitar (Enter manda na hora). Se a URL mudar por fora (limpar filtros),
 * o campo acompanha.
 */
export function SearchBox({
  value,
  onSearch,
  className,
}: {
  value: string;
  onSearch(value: string): void;
  className?: string;
}) {
  const { t } = useTranslation('feed');
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);

  // Valor novo vindo de fora: ajusta o rascunho durante o render (padrão do React, sem efeito).
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }

  useEffect(() => {
    if (draft.trim() === value) return;
    const timer = setTimeout(() => onSearch(draft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onSearch]);

  return (
    <Paper
      component="form"
      role="search"
      elevation={0}
      className={cn('flex items-center gap-1 rounded-full py-1 pr-1 pl-4', className)}
      sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(draft);
      }}
    >
      <SearchRounded fontSize="small" aria-hidden className="text-fg-muted" />
      <InputBase
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('search.placeholder')}
        inputProps={{ 'aria-label': t('search.label'), type: 'search', enterKeyHint: 'search', maxLength: 100 }}
        className="flex-1"
        sx={{ '& input::-webkit-search-cancel-button': { display: 'none' } }}
      />
      {draft && (
        <IconButton
          label={t('search.clear')}
          size="small"
          onClick={() => {
            setDraft('');
            onSearch('');
          }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );
}
