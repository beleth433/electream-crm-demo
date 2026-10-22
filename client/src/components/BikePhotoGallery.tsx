import React, { useEffect, useRef, useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { BikePhoto } from '../types';
import { api } from '../services/api';
import { MAX_BIKE_PHOTOS, optimizeBikePhoto } from '../utils/imageOptimization';
import { toast } from 'sonner';

export interface BikePhotoDraft extends BikePhoto { imageFile?: File; thumbnailFile?: File }

export async function saveBikePhotoDrafts<T>(drafts: BikePhotoDraft[], save: (photos: BikePhoto[]) => Promise<T>, previousPhotos: BikePhoto[] = []): Promise<T> {
  const photos: BikePhoto[] = [];
  const uploaded: BikePhoto[] = [];
  try {
    for (const draft of drafts) {
      if (draft.imageFile && draft.thumbnailFile) {
        const photo = await api.uploadBikePhoto(draft.imageFile, draft.thumbnailFile);
        photos.push(photo);
        uploaded.push(photo);
      } else {
        const { id, url, thumbnailUrl, width, height, sizeBytes } = draft;
        photos.push({ id, url, thumbnailUrl, width, height, sizeBytes });
      }
    }
    const result = await save(photos);
    const removed = previousPhotos.filter((photo) => !photos.some((next) => next.id === photo.id));
    await Promise.allSettled(removed.map((photo) => api.deleteBikePhoto(photo.id)));
    return result;
  } catch (error) {
    await Promise.allSettled(uploaded.map((photo) => api.deleteBikePhoto(photo.id)));
    throw error;
  }
}

interface Props {
  photos: BikePhotoDraft[];
  onChange: (photos: BikePhotoDraft[]) => void;
  onPreparing: (preparing: boolean) => void;
  disabled?: boolean;
}

export const BikePhotoGallery: React.FC<Props> = ({ photos, onChange, onPreparing, disabled }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const ownedUrls = useRef(new Set<string>());
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ownedUrls.current.forEach((url) => URL.revokeObjectURL(url)); ownedUrls.current.clear(); onPreparing(false); };
  }, []);
  const selected = photos.find((photo) => photo.id === selectedId) || photos[0];
  const busy = preparing || disabled;
  const removeSelected = () => {
    if (!selected) return;
    if (selected.imageFile) {
      URL.revokeObjectURL(selected.url);
      URL.revokeObjectURL(selected.thumbnailUrl);
      ownedUrls.current.delete(selected.url);
      ownedUrls.current.delete(selected.thumbnailUrl);
    }
    onChange(photos.filter((photo) => photo.id !== selected.id));
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    const selectedFiles = Array.from(files);
    if (photos.length + selectedFiles.length > MAX_BIKE_PHOTOS) { toast.error(`Можно добавить до ${MAX_BIKE_PHOTOS} фото`); return; }
    setPreparing(true);
    onPreparing(true);
    const added: BikePhotoDraft[] = [];
    try {
      for (const file of selectedFiles) {
        const optimized = await optimizeBikePhoto(file);
        if (!mounted.current) return;
        const url = URL.createObjectURL(optimized.image);
        const thumbnailUrl = URL.createObjectURL(optimized.thumbnail);
        ownedUrls.current.add(url);
        ownedUrls.current.add(thumbnailUrl);
        added.push({ id: crypto.randomUUID(), url, thumbnailUrl, width: optimized.width, height: optimized.height, sizeBytes: optimized.image.size + optimized.thumbnail.size, imageFile: optimized.image, thumbnailFile: optimized.thumbnail });
      }
      onChange([...photos, ...added]);
      setSelectedId(added[0]?.id || null);
    } catch (error: any) {
      added.forEach((photo) => { URL.revokeObjectURL(photo.url); URL.revokeObjectURL(photo.thumbnailUrl); ownedUrls.current.delete(photo.url); ownedUrls.current.delete(photo.thumbnailUrl); });
      if (mounted.current) toast.error(error.message || 'Не удалось подготовить фото');
    } finally {
      if (mounted.current) { setPreparing(false); onPreparing(false); }
      if (input.current) input.current.value = '';
    }
  };

  return (
    <section aria-label="Фотографии велосипеда" className="min-w-0 lg:sticky lg:top-0 self-start space-y-3">
      <div className="flex justify-between items-center"><h4 className="font-bold text-base text-slate-900 dark:text-white">Фото велосипеда</h4><span className="text-xs text-slate-500">{photos.length} / {MAX_BIKE_PHOTOS}</span></div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" aria-label="Выбрать фотографии велосипеда" onChange={(event) => void addFiles(event.target.files)} disabled={busy} />
      <div className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-[#101d17]">
        {selected ? <><img src={selected.url} alt="Фото велосипеда" className="w-full h-full object-contain" decoding="async" /><button type="button" disabled={busy} aria-label="Удалить выбранное фото" onClick={removeSelected} className="absolute top-3 right-3 h-11 w-11 rounded-xl bg-white/95 dark:bg-slate-900/95 shadow-sm flex items-center justify-center text-slate-500 hover:text-rose-600 disabled:opacity-50"><X className="w-5 h-5" /></button></> :
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors" aria-label="Добавить фото велосипеда"><Plus className="h-12 w-12" /><span className="text-sm font-semibold">Добавить фото</span></button>}
        {preparing && <div role="status" className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 flex flex-col items-center justify-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /><span className="text-sm">Подготавливаем фото…</span></div>}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo, index) => <button type="button" key={photo.id} aria-label={`Показать фото ${index + 1}`} aria-pressed={selected?.id === photo.id} onClick={() => setSelectedId(photo.id)} className={`aspect-square min-h-[44px] rounded-xl border-2 overflow-hidden bg-slate-50 dark:bg-slate-900 ${selected?.id === photo.id ? 'border-emerald-500' : 'border-transparent'}`}><img src={photo.thumbnailUrl} alt={`Фото велосипеда ${index + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" /></button>)}
        {photos.length > 0 && photos.length < MAX_BIKE_PHOTOS && <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label="Добавить ещё фото" className="aspect-square min-h-[44px] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-emerald-600"><Plus className="h-6 w-6" /></button>}
      </div>
      <p className="text-xs text-slate-500">Можно выбрать несколько фото. Первое фото отображается в парке техники.</p>
    </section>
  );
};

export const BikePhotoPreview: React.FC<{ photos?: BikePhoto[]; onClick: () => void; label: string }> = ({ photos, onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={photos?.length ? `Открыть фото ${label}` : `Добавить фото ${label}`} className="w-16 h-16 shrink-0 rounded-xl border border-slate-200 dark:border-emerald-500/20 bg-slate-50 dark:bg-slate-900 overflow-hidden flex items-center justify-center text-slate-400 hover:text-emerald-600">
    {photos?.[0] ? <img src={photos[0].thumbnailUrl} alt={label} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <Plus className="w-6 h-6" />}
  </button>
);
