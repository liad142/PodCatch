import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
} from "remotion";
import { COLORS, FONTS, fullScreenStyle } from "../styles";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo icon animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.5 },
  });

  // Title animation
  const titleProgress = spring({
    frame: frame - 12,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });
  const titleY = interpolate(titleProgress, [0, 1], [50, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Subtitle animation
  const subProgress = spring({
    frame: frame - 24,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });
  const subY = interpolate(subProgress, [0, 1], [30, 0]);
  const subOpacity = interpolate(subProgress, [0, 1], [0, 1]);

  // Tagline animation
  const tagProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 30, stiffness: 80, mass: 1 },
  });
  const tagOpacity = interpolate(tagProgress, [0, 1], [0, 1]);

  // Pulse ring on logo
  const pulseScale = interpolate(frame % 60, [0, 60], [1, 2.5], {
    extrapolateRight: "clamp",
  });
  const pulseOpacity = interpolate(frame % 60, [0, 60], [0.4, 0], {
    extrapolateRight: "clamp",
  });

  // Decorative line
  const lineWidth = interpolate(frame - 50, [0, 30], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        ...fullScreenStyle,
        background: COLORS.gradientHero,
      }}
    >
      {/* Ambient glow orbs */}
      <GlowOrb color={COLORS.primary} size={600} x={-100} y={-100} />
      <GlowOrb color={COLORS.accentPink} size={400} x={1400} y={600} delay={15} />
      <GlowOrb color={COLORS.accentCyan} size={350} x={200} y={800} delay={30} />

      {/* Particle field */}
      <ParticleField count={35} color="rgba(167, 139, 250, 0.3)" />

      {/* Grid overlay for tech feel */}
      <div
        style={{
          ...fullScreenStyle,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo icon with pulse */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          {/* Pulse ring */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 100,
              height: 100,
              borderRadius: "50%",
              border: `2px solid ${COLORS.primary}`,
              transform: `translate(-50%, -50%) scale(${pulseScale})`,
              opacity: pulseOpacity,
            }}
          />

          {/* Logo circle */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accentPink})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${logoScale})`,
              boxShadow: `0 0 60px ${COLORS.primaryGlow}`,
            }}
          >
            <div
              style={{
                fontSize: 48,
                color: "white",
                fontWeight: 900,
                fontFamily: FONTS.heading,
              }}
            >
              P
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            fontFamily: FONTS.heading,
            background: COLORS.gradientPrimary,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transform: `translateY(${titleY}px)`,
            opacity: titleOpacity,
            letterSpacing: "-2px",
          }}
        >
          PodCatch
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            fontFamily: FONTS.body,
            color: COLORS.textSecondary,
            transform: `translateY(${subY}px)`,
            opacity: subOpacity,
            marginTop: 8,
          }}
        >
          AI-Powered Podcast Intelligence
        </div>

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            background: COLORS.gradientPrimary,
            borderRadius: 1,
            marginTop: 32,
            opacity: interpolate(frame - 50, [0, 15], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            fontFamily: FONTS.body,
            color: COLORS.textMuted,
            opacity: tagOpacity,
            marginTop: 24,
            letterSpacing: "4px",
            textTransform: "uppercase",
          }}
        >
          Discover &bull; Summarize &bull; Understand
        </div>
      </div>
    </AbsoluteFill>
  );
};
