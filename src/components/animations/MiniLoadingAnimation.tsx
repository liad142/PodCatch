"use client";

import { motion } from 'framer-motion';

interface MiniLoadingAnimationProps {
  message: string;
  className?: string;
}

export function MiniLoadingAnimation({ message, className = '' }: MiniLoadingAnimationProps) {
  const barColors = [
    'from-purple-500 to-purple-400',
    'from-blue-500 to-blue-400',
    'from-cyan-500 to-cyan-400',
  ];

  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-12 ${className}`}>
      <div className="flex items-center justify-center gap-1">
        {barColors.map((color, index) => (
          <motion.div
            key={index}
            className={`w-1 rounded-full bg-gradient-to-t ${color}`}
            initial={{ height: 6 }}
            animate={{
              height: [6, 16, 10, 18, 6],
              opacity: [0.6, 1, 0.7, 1, 0.6],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.12,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">This usually takes a few moments</p>
      </div>
    </div>
  );
}
