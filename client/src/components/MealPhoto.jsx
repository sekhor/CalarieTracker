import React, { useEffect, useRef, useState } from 'react';
import { Utensils } from 'lucide-react';
import { getCachedMealPhoto, getMealPhotoObjectUrl } from '../services/mealPhotoCache';

export default function MealPhoto({ imageUrl, alt, className = '', iconSize = 22 }) {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [photoSrc, setPhotoSrc] = useState(() => getCachedMealPhoto(imageUrl));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setPhotoSrc(getCachedMealPhoto(imageUrl));
    setHasError(false);
    setIsVisible(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl || photoSrc || !containerRef.current) return undefined;

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '250px' });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imageUrl, photoSrc]);

  useEffect(() => {
    let isMounted = true;
    if (!imageUrl || !isVisible || photoSrc) return undefined;

    getMealPhotoObjectUrl(imageUrl)
      .then((objectUrl) => {
        if (isMounted) setPhotoSrc(objectUrl);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Failed to load meal photo:', error);
        setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl, isVisible, photoSrc]);

  if (!imageUrl || hasError || !photoSrc) {
    return (
      <span ref={containerRef} className="meal-photo-placeholder" aria-label={alt || 'Meal photo'}>
        <Utensils size={iconSize} />
      </span>
    );
  }

  return <img ref={containerRef} src={photoSrc} alt={alt} className={className} loading="lazy" decoding="async" />;
}
