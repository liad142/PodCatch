import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { COLORS, FONTS } from "../styles";

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  accentColor: string;
  delay?: number;
  x?: number;
  y?: number;
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  accentColor,
  delay = 0,
  x = 0,
  y = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.6 },
  });

  const scale = interpolate(scaleProgress, [0, 1], [0.7, 1]);
  const opacity = interpolate(scaleProgress, [0, 1], [0, 1]);

  const glowOpacity = interpolate(
    frame - delay,
    [0, 30, 60],
    [0, 0.5, 0.3],
    { extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          width: 360,
          padding: "36px 32px",
          borderRadius: 24,
          background: COLORS.bgCard,
          border: `1px solid ${COLORS.bgAccent}`,
          boxShadow: `0 0 40px ${accentColor}33, 0 20px 60px rgba(0,0,0,0.4)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow accent */}
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: accentColor,
            opacity: glowOpacity,
            filter: "blur(40px)",
          }}
        />

        <div
          style={{
            fontSize: 48,
            marginBottom: 16,
            position: "relative",
          }}
        >
          {icon}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.textPrimary,
            fontFamily: FONTS.heading,
            marginBottom: 10,
            position: "relative",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 15,
            color: COLORS.textSecondary,
            fontFamily: FONTS.body,
            lineHeight: 1.5,
            position: "relative",
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
