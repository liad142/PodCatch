"use client";

import { motion } from 'framer-motion';

interface SoundWaveAnimationProps {
  className?: string;
}

export function SoundWaveAnimation({ className = '' }: SoundWaveAnimationProps) {
  const barColors = [
    'from-blue-500 to-blue-400',
    'from-blue-500 to-blue-400',
    'from-cyan-500 to-cyan-400',
    'from-teal-500 to-teal-400',
  ];

  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {barColors.map((color, index) => (
        <motion.div
          key={index}
          className={`w-1 rounded-full bg-gradient-to-t ${color}`}
          initial={{ height: 8 }}
          animate={{
            height: [8, 20, 12, 24, 8],
            opacity: [0.7, 1, 0.8, 1, 0.7],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
