import FlipRounded from '@mui/icons-material/FlipRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import Rotate90DegreesCwRounded from '@mui/icons-material/Rotate90DegreesCwRounded';
import ZoomInRounded from '@mui/icons-material/ZoomInRounded';
import ZoomOutRounded from '@mui/icons-material/ZoomOutRounded';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Slider from '@mui/material/Slider';
import ToggleButton from '@mui/material/ToggleButton';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '@/components/ui/Button';
import { useIsMobile } from '@/core/hooks/useMediaQuery';
import { useObjectUrl } from '@/core/hooks/useObjectUrl';
import { renderCroppedImage } from '@/core/utils/image';

/** Proporção das fotos do item (decisão do plano: 4:3 fixo, a do card). */
export const PHOTO_ASPECT = 4 / 3;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface EditorState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

const INITIAL: EditorState = { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, flipH: false, flipV: false };

export interface PhotoEditorModalProps {
  /** Foto original a editar; `null` fecha o editor. */
  file: File | null;
  onCancel(): void;
  onApply(edited: File): void;
  /** Proporção do corte (padrão 4:3, a das fotos do item). */
  aspect?: number;
  /** Corte redondo (foto de perfil). */
  round?: boolean;
  /** Título e dica do editor (padrão: os das fotos do item). */
  title?: string;
  hint?: string;
}

/**
 * Editor de foto (plano, fase 4): arrastar para posicionar, zoom (slider, pinça ou roda do mouse),
 * girar 90°, espelhar na horizontal e na vertical, na proporção pedida (4:3 nas fotos do item, 1:1 na foto
 * de perfil, 3:1 no banner). Modal no desktop, tela cheia no celular.
 * O espelho é só CSS na prévia; o arquivo final sai do <canvas> (`renderCroppedImage`).
 */
export function PhotoEditorModal({
  file,
  onCancel,
  onApply,
  aspect = PHOTO_ASPECT,
  round = false,
  title,
  hint,
}: PhotoEditorModalProps) {
  const { t } = useTranslation(['donations', 'common']);
  const isMobile = useIsMobile();
  const titleId = useId();
  const [state, setState] = useState<EditorState>(INITIAL);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [source, setSource] = useState(file);

  // Outra foto: começa do zero (ajuste durante o render, sem efeito).
  if (file !== source) {
    setSource(file);
    setState(INITIAL);
    setArea(null);
    setError(false);
  }

  const url = useObjectUrl(file);

  const set = (patch: Partial<EditorState>) => setState((s) => ({ ...s, ...patch }));
  const { crop, zoom, rotation, flipH, flipV } = state;

  const apply = async () => {
    if (!file || !area) return;
    setBusy(true);
    setError(false);
    try {
      onApply(await renderCroppedImage(file, area, { rotation, flipH, flipV }));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(file)}
      onClose={busy ? undefined : onCancel}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth
      aria-labelledby={titleId}
    >
      <DialogTitle id={titleId}>{title ?? t('editor.title')}</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        <Typography variant="body2" color="text.secondary">
          {hint ?? t('editor.hint')}
        </Typography>
        <div
          className="relative w-full overflow-hidden rounded-xl bg-neutral-900"
          style={{ height: isMobile ? '55dvh' : 420 }}
        >
          {url && (
            <Cropper
              key={url}
              image={url}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={round ? 'round' : 'rect'}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onCropChange={(c) => set({ crop: c })}
              onZoomChange={(z) => set({ zoom: z })}
              onRotationChange={(r) => set({ rotation: r })}
              onCropComplete={(_, pixels) => setArea(pixels)}
              transform={[
                `translate(${crop.x}px, ${crop.y}px)`,
                `rotate(${rotation}deg)`,
                `scale(${zoom * (flipH ? -1 : 1)}, ${zoom * (flipV ? -1 : 1)})`,
              ].join(' ')}
              mediaProps={{ alt: '' }}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            label={t('editor.zoomOut')}
            onClick={() => set({ zoom: Math.max(MIN_ZOOM, zoom - 0.25) })}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOutRounded />
          </IconButton>
          <Slider
            aria-label={t('editor.zoom')}
            value={zoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            onChange={(_, v) => set({ zoom: v as number })}
            className="flex-1"
          />
          <IconButton
            label={t('editor.zoomIn')}
            onClick={() => set({ zoom: Math.min(MAX_ZOOM, zoom + 0.25) })}
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomInRounded />
          </IconButton>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="secondary"
            icon={<Rotate90DegreesCwRounded />}
            onClick={() => set({ rotation: (rotation + 90) % 360 })}
          >
            {t('editor.rotate')}
          </Button>
          <ToggleButton
            value="flipH"
            size="small"
            selected={flipH}
            onChange={() => set({ flipH: !flipH })}
            aria-label={t('editor.flipH')}
            title={t('editor.flipH')}
          >
            <FlipRounded />
          </ToggleButton>
          <ToggleButton
            value="flipV"
            size="small"
            selected={flipV}
            onChange={() => set({ flipV: !flipV })}
            aria-label={t('editor.flipV')}
            title={t('editor.flipV')}
          >
            <FlipRounded className="rotate-90" />
          </ToggleButton>
          <Button variant="ghost" icon={<RestartAltRounded />} onClick={() => setState(INITIAL)}>
            {t('editor.reset')}
          </Button>
        </div>
        {error && <Alert severity="error">{t('editor.error')}</Alert>}
      </DialogContent>
      <DialogActions className="gap-2 border-t border-border px-5 py-3">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('common:actions.cancel')}
        </Button>
        <Button onClick={() => void apply()} loading={busy} disabled={!area}>
          {t('editor.apply')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
