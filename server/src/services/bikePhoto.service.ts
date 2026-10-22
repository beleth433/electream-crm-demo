export function readWebPDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP' || buffer.readUInt32LE(4) + 8 !== buffer.length) throw new Error('Некорректное изображение WebP');
  const format = buffer.toString('ascii', 12, 16);
  if (format === 'VP8X') {
    if (buffer[20] & 2) throw new Error('Добавьте статичное фото вместо анимации');
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  if (format === 'VP8L' && buffer[20] === 0x2f) {
    const dimensions = buffer.readUInt32LE(21);
    return { width: (dimensions & 0x3fff) + 1, height: ((dimensions >>> 14) & 0x3fff) + 1 };
  }
  if (format === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 1 && buffer[25] === 0x2a) return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  throw new Error('Некорректное изображение WebP');
}

export function validateBikePhoto(buffer: Buffer, thumbnail = false) {
  const maxBytes = (thumbnail ? 60 : 400) * 1024;
  const maxDimension = thumbnail ? 480 : 1600;
  if (buffer.length > maxBytes) throw new Error(thumbnail ? 'Миниатюра слишком большая' : 'Фотография слишком большая');
  const dimensions = readWebPDimensions(buffer);
  if (dimensions.width < 1 || dimensions.height < 1 || Math.max(dimensions.width, dimensions.height) > maxDimension) throw new Error('Размеры фотографии превышают допустимые');
  return dimensions;
}
