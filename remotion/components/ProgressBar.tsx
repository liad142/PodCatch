import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { COLORS } from "../styles";

type ProgressBarProps = {
  progress: number; // 0-100
  label: string;
  color?: string;
  delay?: number;
  width?: number;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  color = COLORS.primary,
  delay = 0,
  width = 500,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 30, stiffness: 80, mass: 1 },
  });

  const barWidth = interpolate(animProgress, [0, 1], [0, progress]);
  const opacity = interpolate(animProgress, [0, 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity, width }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontFamily: "Inter, system-ui",
          fontSize: 14,
          color: COLORS.textSecondary,
        }}
      >
        <span>{label}</span>
        <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>
          {Math.round(barWidth)}%
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 8,
          borderRadius: 4,
          background: COLORS.bgAccent,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${color}, ${color}CC)`,
            boxShadow: `0 0 20px ${color}66`,
          }}
        />
      </div>
    </div>
  );
};
