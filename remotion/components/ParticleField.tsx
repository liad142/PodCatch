import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
};

type ParticleFieldProps = {
  count?: number;
  color?: string;
};

// Deterministic pseudo-random for consistent renders
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 40,
  color = "rgba(124, 58, 237, 0.4)",
}) => {
  const frame = useCurrentFrame();

  const particles: Particle[] = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: seededRandom(i * 7 + 1) * 1920,
      y: seededRandom(i * 13 + 2) * 1080,
      size: seededRandom(i * 3 + 5) * 4 + 1,
      speed: seededRandom(i * 11 + 3) * 0.5 + 0.2,
      opacity: seededRandom(i * 17 + 4) * 0.5 + 0.1,
      delay: seededRandom(i * 19 + 6) * 60,
    }));
  }, [count]);

  return (
    <>
      {particles.map((p, i) => {
        const drift = interpolate(
          frame,
          [0, 300],
          [0, p.speed * 100],
          { extrapolateRight: "extend" }
        );

        const twinkle = interpolate(
          (frame + p.delay) % 90,
          [0, 45, 90],
          [p.opacity * 0.5, p.opacity, p.opacity * 0.5]
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: ((p.x + drift) % 1960) - 20,
              top: p.y + Math.sin((frame + p.delay) * 0.03) * 15,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: color,
              opacity: twinkle,
              boxShadow: `0 0 ${p.size * 2}px ${color}`,
            }}
          />
        );
      })}
    </>
  );
};
