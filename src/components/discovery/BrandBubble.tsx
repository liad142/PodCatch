'use client';

import Image from 'next/image';
import Link from 'next/link';

interface BrandBubbleProps {
  id: string;
  name: string;
  artworkUrl: string;
}

export function BrandBubble({ id, name, artworkUrl }: BrandBubbleProps) {
  const imageUrl = artworkUrl?.replace('100x100', '200x200') || '/placeholder-podcast.png';

  return (
    <Link href={`/browse/podcast/${id}`} className="flex flex-col items-center gap-2 group cursor-pointer">
      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background transition-all duration-200">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
      <span className="text-body-sm text-foreground font-medium line-clamp-1 text-center max-w-[88px]">
        {name}
      </span>
    </Link>
  );
}
