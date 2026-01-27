"use client";

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GemCompleteAnimationProps {
  className?: string;
  onComplete?: () => void;
}

export function GemCompleteAnimation({ className = '', onComplete }: GemCompleteAnimationProps) {
  const [showBurst, setShowBurst] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowBurst(false);
      onComplete?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {showBurst && [...Array(8)].map((_, i) => {
        const angle = (i / 8) * 360;
        return (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-yellow-300"
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * 20,
              y: Math.sin((angle * Math.PI) / 180) * 20,
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 0.6,
              ease: 'easeOut',
            }}
          />
        );
      })}

      <motion.div
        className="relative"
        initial={{ scale: 0.8 }}
        animate={{ scale: [0.8, 1, 0.95, 1] }}
        transition={{
          duration: 0.6,
          times: [0, 0.3, 0.6, 1],
        }}
      >
        <motion.div
          className="w-5 h-5 rotate-45 rounded-sm relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6)',
          }}
          animate={{
            boxShadow: [
              '0 0 8px rgba(236, 72, 153, 0.6)',
              '0 0 16px rgba(139, 92, 246, 0.8)',
              '0 0 8px rgba(245, 158, 11, 0.6)',
              '0 0 16px rgba(236, 72, 153, 0.8)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
