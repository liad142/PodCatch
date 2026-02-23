import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

type GlowOrbProps = {
  color: string;
  size: number;
  x: number;
  y: number;
  delay?: number;
};

export const GlowOrb: React.FC<GlowOrbProps> = ({
  color,
  size,
  x,
  y,
  delay = 0,
}) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame - delay, [0, 60, 120], [0.8, 1.2, 0.8], {
    extrapolateRight: "extend",
  });

  const opacity = interpolate(frame - delay, [0, 30], [0, 0.6], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        transform: `scale(${scale})`,
        opacity,
        filter: "blur(60px)",
        pointerEvents: "none",
      }}
    />
  );
};
