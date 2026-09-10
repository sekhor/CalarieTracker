export async function optimizeImageFile(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  if (!('createImageBitmap' in window)) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

  if (scale === 1 && file.size <= 2 * 1024 * 1024) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { alpha: false });
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error('Unable to optimize image.')),
      'image/jpeg',
      quality,
    );
  });

  const optimizedName = `${file.name.replace(/\.[^.]+$/, '') || 'meal'}.jpg`;
  return new File([blob], optimizedName, { type: 'image/jpeg', lastModified: Date.now() });
}
