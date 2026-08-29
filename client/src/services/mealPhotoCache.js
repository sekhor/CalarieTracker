import { fetchMealPhotoBlob, getStoredToken } from './api';

const photoCache = new Map();
const pendingPhotos = new Map();
const MAX_CACHED_PHOTOS = 100;
let cacheGeneration = 0;

const getPhotoCacheKey = (imageUrl) => `${getStoredToken() || 'anonymous'}::${imageUrl}`;

export function clearMealPhotoCache() {
  cacheGeneration += 1;
  photoCache.forEach((objectUrl) => window.URL.revokeObjectURL(objectUrl));
  photoCache.clear();
  pendingPhotos.clear();
}

export function getCachedMealPhoto(imageUrl) {
  return photoCache.get(getPhotoCacheKey(imageUrl)) || null;
}

export async function getMealPhotoObjectUrl(imageUrl) {
  const cacheKey = getPhotoCacheKey(imageUrl);
  const requestGeneration = cacheGeneration;
  if (photoCache.has(cacheKey)) return photoCache.get(cacheKey);
  if (pendingPhotos.has(cacheKey)) return pendingPhotos.get(cacheKey);

  const pending = fetchMealPhotoBlob(imageUrl).then((blob) => {
    const objectUrl = window.URL.createObjectURL(blob);
    if (requestGeneration !== cacheGeneration) {
      window.URL.revokeObjectURL(objectUrl);
      throw new Error('Meal photo request was invalidated.');
    }

    photoCache.set(cacheKey, objectUrl);
    if (pendingPhotos.get(cacheKey) === pending) pendingPhotos.delete(cacheKey);

    if (photoCache.size > MAX_CACHED_PHOTOS) {
      const [oldestKey, oldestUrl] = photoCache.entries().next().value;
      photoCache.delete(oldestKey);
      window.URL.revokeObjectURL(oldestUrl);
    }

    return objectUrl;
  }).catch((error) => {
    if (pendingPhotos.get(cacheKey) === pending) pendingPhotos.delete(cacheKey);
    throw error;
  });

  pendingPhotos.set(cacheKey, pending);
  return pending;
}
