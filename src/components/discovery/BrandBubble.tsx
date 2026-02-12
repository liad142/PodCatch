'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface BrandBubbleProps {
  id: string;
  name: string;
  artworkUrl: string;
}

export function BrandBubble({ id, name, artworkUrl }: BrandBubbleProps) {
  const imageUrl = artworkUrl?.replace('100x100', '200x200') || '/placeholder-podcast.png';

  return (
    <Link href={`/browse/podcast/${id}`} className="flex flex-col items-center gap-2 group">
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden group-hover:shadow-lg transition-all shadow-md"
      >
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          unoptimized
        />
      </motion.div>
      <span className="text-xs text-muted-foreground text-center w-24 leading-tight group-hover:text-foreground transition-colors break-words">
        {name}
      </span>
    </Link>
  );
}
