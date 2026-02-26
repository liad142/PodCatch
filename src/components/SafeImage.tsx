'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

/**
 * SafeImage wraps next/image with error handling.
 * If the image domain isn't configured in next.config.js remotePatterns,
 * it falls back to a plain <img> tag (unoptimized but still works).
 * This is essential for podcast artwork from arbitrary RSS feed domains.
 */
export function SafeImage({ alt, ...props }: ImageProps) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    const { fill, sizes, quality, priority, placeholder, blurDataURL, loader, ...imgProps } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...imgProps}
        alt={alt}
        src={typeof props.src === 'string' ? props.src : ''}
        style={fill ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...((props.style as React.CSSProperties) || {}) } : (props.style as React.CSSProperties)}
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      onError={() => setUseFallback(true)}
    />
  );
}
