import React, { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import { fetchMealPhotoBlob } from '../services/api';

export default function MealPhoto({ imageUrl, alt, className = '', iconSize = 22 }) {
  const [photoSrc, setPhotoSrc] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;

    const loadPhoto = async () => {
      if (!imageUrl) {
        setPhotoSrc(null);
        setHasError(false);
        return;
      }

      try {
        setHasError(false);
        const blob = await fetchMealPhotoBlob(imageUrl);
        if (!isMounted) return;

        objectUrl = window.URL.createObjectURL(blob);
        setPhotoSrc(objectUrl);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load meal photo:', error);
        setPhotoSrc(null);
        setHasError(true);
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (!imageUrl || hasError || !photoSrc) {
    return <Utensils size={iconSize} />;
  }

  return <img src={photoSrc} alt={alt} className={className} />;
}