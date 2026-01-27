"use client";

import { motion } from 'framer-motion';

interface ParticleGemAnimationProps {
  className?: string;
}

export function ParticleGemAnimation({ className = '' }: ParticleGemAnimationProps) {
  const particleCount = 8;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {[...Array(particleCount)].map((_, i) => {
        const angle = (i / particleCount) * 360;
        const radius = 16;
        const startX = Math.cos((angle * Math.PI) / 180) * radius;
        const startY = Math.sin((angle * Math.PI) / 180) * radius;

        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${i % 2 === 0 ? '#f59e0b' : '#ec4899'}, ${i % 2 === 0 ? '#ec4899' : '#8b5cf6'})`,
            }}
            initial={{ x: startX, y: startY, scale: 1, opacity: 0.8 }}
            animate={{
              x: [startX, startX * 0.5, 0],
              y: [startY, startY * 0.5, 0],
              scale: [1, 0.8, 0],
              opacity: [0.8, 1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut',
            }}
          />
        );
      })}

      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: 0 }}
        animate={{
          scale: [0, 0.3, 0.5, 0.3],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div
          className="w-4 h-4 rotate-45 rounded-sm"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
            boxShadow: '0 0 12px rgba(236, 72, 153, 0.5)',
          }}
        />
      </motion.div>
    </div>
  );
}
