"use client";

import { motion } from 'framer-motion';

interface QueuePositionIndicatorProps {
  position: number;
  className?: string;
}

export function QueuePositionIndicator({ position, className = '' }: QueuePositionIndicatorProps) {
  const ordinal = getOrdinal(position);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <span className="text-xs text-muted-foreground font-medium">
        {ordinal} in queue
      </span>
    </div>
  );
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
