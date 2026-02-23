import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { COLORS, FONTS } from "../styles";

type AnimatedTextProps = {
  text: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number;
  delay?: number;
  style?: React.CSSProperties;
  gradient?: boolean;
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 64,
  color = COLORS.textPrimary,
  fontFamily = FONTS.heading,
  fontWeight = 700,
  delay = 0,
  style = {},
  gradient = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 30,
      stiffness: 120,
      mass: 0.8,
    },
  });

  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  const textStyle: React.CSSProperties = {
    fontSize,
    fontFamily,
    fontWeight,
    color: gradient ? "transparent" : color,
    transform: `translateY(${translateY}px)`,
    opacity,
    lineHeight: 1.2,
    ...(gradient
      ? {
          background: COLORS.gradientPrimary,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }
      : {}),
    ...style,
  };

  return <div style={textStyle}>{text}</div>;
};
