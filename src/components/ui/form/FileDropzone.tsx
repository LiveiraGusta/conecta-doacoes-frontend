import CloudUploadRounded from '@mui/icons-material/CloudUploadRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/core/utils/cn';
import { formatBytes } from '@/core/utils/files';
import { Button, IconButton } from '../Button';
import { FieldError } from './Field';

export interface FileDropzoneProps {
  label: string;
  /** Tipos aceitos (MIME), também usados no `accept` do input. */
  accept: readonly string[];
  value: File | null;
  onChange(file: File | null): void;
  error?: string;
  hint?: string;
  name?: string;
}

/**
 * Área de arrastar-e-soltar (ou clicar) para 1 arquivo, com peças do MUI: mostra nome, tamanho e miniatura
 * (imagem) ou ícone (PDF), com "Trocar" e "Remover". O MUI não tem um componente pronto para isso.
 * A validação de tipo e tamanho fica no schema do formulário.
 */
export function FileDropzone({ label, accept, value, onChange, error, hint, name }: FileDropzoneProps) {
  const { t } = useTranslation('auth');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const id = useId();
  const errorId = `${id}-erro`;
  const hintId = `${id}-dica`;

  // Miniatura só para imagem; a URL temporária é liberada quando o arquivo muda ou o campo sai da tela.
  const preview = useMemo(() => (value?.type.startsWith('image/') ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onChange(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Typography id={`${id}-rotulo`} variant="subtitle2" component="span">
        {label}
      </Typography>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept.join(',')}
        className="sr-only"
        aria-labelledby={`${id}-rotulo`}
        aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = ''; // permite escolher o mesmo arquivo de novo
        }}
      />
      {value ? (
        <Paper
          variant="outlined"
          className="flex items-center gap-3 p-3"
          sx={error ? { borderColor: 'error.main' } : undefined}
        >
          {preview ? (
            <img src={preview} alt="" className="size-12 rounded-lg object-cover" />
          ) : (
            <span
              className="flex size-12 items-center justify-center rounded-lg bg-danger/10 text-2xl text-danger"
              aria-hidden
            >
              <PictureAsPdfRounded fontSize="inherit" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap data-testid="arquivo-nome">
              {value.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(value.size)}
            </Typography>
          </div>
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            {t('file.replace')}
          </Button>
          <IconButton label={t('file.remove')} onClick={() => onChange(null)}>
            <DeleteOutlineRounded />
          </IconButton>
        </Paper>
      ) : (
        <ButtonBase
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files);
          }}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
            dragging
              ? 'border-primary-500 bg-primary-soft'
              : error
                ? 'border-danger'
                : 'border-border hover:bg-surface-alt',
          )}
        >
          <CloudUploadRounded aria-hidden className="text-3xl text-primary-text" fontSize="inherit" />
          <Typography variant="subtitle2" component="span">
            {t('file.drop')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('file.orClick')}
          </Typography>
        </ButtonBase>
      )}
      {hint && (
        <Typography id={hintId} variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
