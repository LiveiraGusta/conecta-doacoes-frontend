import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AddPhotoAlternateRounded from '@mui/icons-material/AddPhotoAlternateRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded';
import Alert from '@mui/material/Alert';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/form/Field';
import { useObjectUrl } from '@/core/hooks/useObjectUrl';
import { PHOTO_COUNT, type PhotoSlot } from '@/core/schemas/item';
import { cn } from '@/core/utils/cn';
import { fileProblem, formatBytes, IMAGE_TYPES, MAX_ORIGINAL_PHOTO_BYTES } from '@/core/utils/files';
import { PhotoEditorModal } from './PhotoEditorModal';

let slotSeq = 0;
const newSlotId = () => `foto-${++slotSeq}`;

interface SlotProps {
  slot: PhotoSlot;
  index: number;
  total: number;
  onMove(to: number): void;
  onEdit(): void;
  onRemove(): void;
}

function SortableSlot({ slot, index, total, onMove, onEdit, onRemove }: SlotProps) {
  const { t } = useTranslation('donations');
  const url = useObjectUrl(slot.file);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: slot.id,
  });
  const n = index + 1;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('list-none', isDragging && 'z-10 opacity-80')}
    >
      <Paper variant="outlined" className="overflow-hidden" sx={isDragging ? { boxShadow: 6 } : undefined}>
        <div className="relative aspect-[4/3] bg-surface-alt">
          <img src={url ?? undefined} alt={t('photos.photo', { n })} className="size-full object-cover" />
          <Chip
            label={index === 0 ? t('photos.cover') : t('photos.photo', { n })}
            color={index === 0 ? 'primary' : 'default'}
            size="small"
            className="absolute top-2 left-2"
            sx={index === 0 ? undefined : { bgcolor: 'background.paper' }}
          />
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={t('photos.drag', { n })}
            className="absolute top-2 right-2 flex size-8 cursor-grab touch-none items-center justify-center rounded-full bg-black/55 text-white active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <DragIndicatorRounded fontSize="small" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-0.5 px-1 py-1">
          <IconButton
            label={t('photos.moveLeft', { n })}
            size="small"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            <ChevronLeftRounded fontSize="small" />
          </IconButton>
          <IconButton
            label={t('photos.moveRight', { n })}
            size="small"
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
          >
            <ChevronRightRounded fontSize="small" />
          </IconButton>
          <IconButton
            label={t('photos.makeCover', { n })}
            size="small"
            disabled={index === 0}
            onClick={() => onMove(0)}
          >
            <StarOutlineRounded fontSize="small" />
          </IconButton>
          <IconButton label={t('photos.edit', { n })} size="small" onClick={onEdit}>
            <EditRounded fontSize="small" />
          </IconButton>
          <IconButton label={t('photos.remove', { n })} size="small" onClick={onRemove}>
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </div>
      </Paper>
    </li>
  );
}

export interface PhotoPickerProps {
  value: PhotoSlot[];
  onChange(slots: PhotoSlot[]): void;
  error?: string;
  /** id do erro, para o aria-describedby do campo. */
  id: string;
}

/**
 * As 3 fotos do item (plano, fase 4): escolher ou soltar arquivos, cada um passa pelo editor (4:3),
 * e a ordem muda arrastando (@dnd-kit, também pelo teclado) ou pelas setas e "Usar como capa".
 * A 1ª é a capa. A validação final (3 fotos, tipo, 5 MB) fica no schema do formulário.
 */
export function PhotoPicker({ value, onChange, error, id }: PhotoPickerProps) {
  const { t } = useTranslation('donations');
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<File[]>([]);
  const [editingSlot, setEditingSlot] = useState<PhotoSlot | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const position = (slotId: string | number) => value.findIndex((s) => s.id === slotId) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('photos.dragStart', { n: position(active.id) }),
    onDragOver: ({ over }) => (over ? t('photos.dragOver', { n: position(over.id) }) : undefined),
    onDragEnd: ({ over }) => (over ? t('photos.dragEnd', { n: position(over.id) }) : t('photos.dragCancel')),
    onDragCancel: () => t('photos.dragCancel'),
  };

  const free = PHOTO_COUNT - value.length - queue.length;

  const pick = (files: FileList | null) => {
    if (!files?.length) return;
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      const problem = fileProblem(file, IMAGE_TYPES, MAX_ORIGINAL_PHOTO_BYTES);
      if (problem === 'type') problems.push(t('photos.badType', { name: file.name }));
      else if (problem === 'size')
        problems.push(t('photos.tooBig', { name: file.name, max: formatBytes(MAX_ORIGINAL_PHOTO_BYTES) }));
      else accepted.push(file);
    }
    if (accepted.length > free) problems.push(t('photos.tooMany'));
    setNotices(problems);
    setQueue((q) => [...q, ...accepted.slice(0, Math.max(0, free))]);
  };

  const move = (from: number, to: number) => {
    onChange(arrayMove(value, from, to));
    setStatus(t('photos.moved', { n: to + 1 }));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(value, position(active.id) - 1, position(over.id) - 1));
  };

  const editingFile = editingSlot?.original ?? queue[0] ?? null;
  const closeEditor = () => (editingSlot ? setEditingSlot(null) : setQueue((q) => q.slice(1)));
  const applyEdit = (edited: File) => {
    if (editingSlot) {
      onChange(value.map((s) => (s.id === editingSlot.id ? { ...s, file: edited } : s)));
      setEditingSlot(null);
    } else if (queue[0]) {
      onChange([...value, { id: newSlotId(), file: edited, original: queue[0] }]);
      setQueue((q) => q.slice(1));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="photo-input"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext items={value.map((s) => s.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-describedby={error ? id : undefined}>
            {value.map((slot, index) => (
              <SortableSlot
                key={slot.id}
                slot={slot}
                index={index}
                total={value.length}
                onMove={(to) => move(index, to)}
                onEdit={() => setEditingSlot(slot)}
                onRemove={() => onChange(value.filter((s) => s.id !== slot.id))}
              />
            ))}
            {value.length < PHOTO_COUNT && (
              <li className="list-none">
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
                  className={cn(
                    'flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition-colors',
                    dragging
                      ? 'border-primary-500 bg-primary-soft'
                      : error
                        ? 'border-danger'
                        : 'border-border hover:bg-surface-alt',
                  )}
                >
                  <AddPhotoAlternateRounded aria-hidden className="text-4xl text-primary-text" fontSize="inherit" />
                  <Typography variant="subtitle2" component="span">
                    {t('photos.addMore', { count: value.length })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" className="hidden sm:block">
                    {t('photos.drop')}
                  </Typography>
                </ButtonBase>
              </li>
            )}
          </ul>
        </SortableContext>
      </DndContext>
      <span role="status" className="sr-only">
        {status}
      </span>
      {notices.length > 0 && (
        <Alert severity="warning" onClose={() => setNotices([])}>
          {notices.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </Alert>
      )}
      <FieldError id={id} message={error} />
      <PhotoEditorModal file={editingFile} onCancel={closeEditor} onApply={applyEdit} />
    </div>
  );
}
