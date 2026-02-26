'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YouTubeChannelCardProps {
  channelId: string;
  name: string;
  thumbnailUrl: string;
  description?: string;
  selected: boolean;
  onToggle: (channelId: string) => void;
}

export function YouTubeChannelCard({
  channelId,
  name,
  thumbnailUrl,
  description,
  selected,
  onToggle,
}: YouTubeChannelCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(channelId)}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50'
      )}
    >
      {/* Channel thumbnail */}
      <div className="relative shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-bold">
              {name.charAt(0)}
            </div>
          )}
        </div>
        {/* Checkmark overlay */}
        {selected && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>

      {/* Channel info */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          selected ? 'text-primary' : 'text-foreground'
        )}>
          {name}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {description}
          </p>
        )}
      </div>
    </motion.button>
  );
}
