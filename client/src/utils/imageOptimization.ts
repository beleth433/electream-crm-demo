export const MAX_BIKE_PHOTOS = 8;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

async function encodeWebP(source: ImageBitmap, maxEdge: number, targetBytes: number, quality: number) {
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  let width = Math.max(1, Math.round(source.width * scale));
  let height = Math.max(1, Math.round(source.height * scale));
  for (let attempt = 0; attempt < 10; attempt++) {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось обработать фотографию');
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Не удалось сжать фотографию')), 'image/webp', quality));
    if (blob.type !== 'image/webp') throw new Error('Этот браузер не поддерживает подготовку фото WebP');
    if (blob.size <= targetBytes) return { blob, width, height };
    if (quality > 0.58) quality -= 0.08;
    else { width = Math.max(1, Math.round(width * 0.85)); height = Math.max(1, Math.round(height * 0.85)); }
  }
  throw new Error('Не удалось уменьшить фотографию. Выберите другой снимок.');
}

export async function optimizeBikePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Выберите фото JPEG, PNG или WebP');
  if (file.size > MAX_INPUT_BYTES) throw new Error('Исходное фото должно быть не больше 20 МБ');
  let source: ImageBitmap;
  try { source = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('Не удалось открыть фотографию. Проверьте формат файла.'); }
  try {
    if (source.width * source.height > 60000000) throw new Error('Фотография слишком большая для обработки');
    const image = await encodeWebP(source, 1600, 350 * 1024, 0.84);
    const thumbnail = await encodeWebP(source, 480, 60 * 1024, 0.75);
    return { image: new File([image.blob], 'bike.webp', { type: 'image/webp' }), thumbnail: new File([thumbnail.blob], 'bike_thumb.webp', { type: 'image/webp' }), width: image.width, height: image.height };
  } finally { source.close(); }
}
