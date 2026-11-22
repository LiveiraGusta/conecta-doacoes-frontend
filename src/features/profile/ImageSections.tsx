import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { FormAlert } from '@/components/ui/form/Field';
import { ApiError } from '@/core/api/http';
import { removeAvatar, removeBanner, uploadAvatar, uploadBanner } from '@/core/services/profile';
import type { User } from '@/core/types/api';
import { fileProblem, IMAGE_TYPES, MAX_ORIGINAL_PHOTO_BYTES } from '@/core/utils/files';
import { PhotoEditorModal } from '@/features/donations/PhotoEditorModal';
import { SectionCard } from './SectionCard';
import { useSaveProfile } from './useSaveProfile';

/** Escolher arquivo → editor na proporção certa → envio. Erros de tipo/tamanho aparecem na seção. */
function useImagePicker(upload: (file: File) => void) {
  const { t } = useTranslation('donations');
  const input = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const field = (
    <input
      ref={input}
      type="file"
      accept={IMAGE_TYPES.join(',')}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      data-testid="image-input"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const p = fileProblem(file, IMAGE_TYPES, MAX_ORIGINAL_PHOTO_BYTES);
        if (p === 'type') return setProblem(t('photos.badType', { name: file.name }));
        if (p === 'size') return setProblem(t('photos.tooBig', { name: file.name, max: '20 MB' }));
        setProblem(null);
        setEditing(file);
      }}
    />
  );
  return {
    field,
    problem,
    open: () => input.current?.click(),
    editor: (props: { aspect: number; round?: boolean; title: string; hint: string }) => (
      <PhotoEditorModal
        file={editing}
        onCancel={() => setEditing(null)}
        onApply={(file) => {
          setEditing(null);
          upload(file);
        }}
        {...props}
      />
    ),
  };
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : null);

/** Foto de perfil (doador e ONG): editor 1:1 redondo; sem foto, as iniciais. */
export function AvatarSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const save = useSaveProfile(uploadAvatar, t('avatar.saved'));
  const remove = useSaveProfile(removeAvatar, t('avatar.removed'));
  const picker = useImagePicker((file) => save.mutate(file));
  const error = message(save.error) ?? message(remove.error) ?? picker.problem;

  return (
    <SectionCard id="foto" title={t('avatar.title')} description={t('avatar.description')}>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.name} seed={user.id} src={user.avatar_url} size="xl" />
        <div className="flex flex-wrap gap-2">
          <Button icon={<PhotoCameraRounded />} onClick={picker.open} loading={save.isPending}>
            {user.avatar_url ? t('avatar.change') : t('avatar.add')}
          </Button>
          {user.avatar_url && (
            <Button
              variant="ghost"
              icon={<DeleteOutlineRounded />}
              onClick={() => remove.mutate(undefined)}
              loading={remove.isPending}
            >
              {t('avatar.remove')}
            </Button>
          )}
        </div>
      </div>
      <FormAlert message={error} />
      {picker.field}
      {picker.editor({ aspect: 1, round: true, title: t('avatar.editor'), hint: t('avatar.editorHint') })}
    </SectionCard>
  );
}

/** Banner da ONG: editor 3:1. */
export function BannerSection({ user }: { user: User }) {
  const { t } = useTranslation('profile');
  const save = useSaveProfile(uploadBanner, t('banner.saved'));
  const remove = useSaveProfile(removeBanner, t('banner.removed'));
  const picker = useImagePicker((file) => save.mutate(file));
  const banner = user.ngo_profile?.banner_url;
  const error = message(save.error) ?? message(remove.error) ?? picker.problem;

  return (
    <SectionCard id="banner" title={t('banner.title')} description={t('banner.description')}>
      {banner ? (
        <img src={banner} alt="" className="aspect-[3/1] w-full rounded-xl object-cover" />
      ) : (
        <div className="flex aspect-[3/1] w-full items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white/80">
          {t('banner.empty')}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button icon={<PhotoCameraRounded />} onClick={picker.open} loading={save.isPending}>
          {banner ? t('banner.change') : t('banner.add')}
        </Button>
        {banner && (
          <Button
            variant="ghost"
            icon={<DeleteOutlineRounded />}
            onClick={() => remove.mutate(undefined)}
            loading={remove.isPending}
          >
            {t('banner.remove')}
          </Button>
        )}
      </div>
      <FormAlert message={error} />
      {picker.field}
      {picker.editor({ aspect: 3, title: t('banner.editor'), hint: t('banner.editorHint') })}
    </SectionCard>
  );
}
