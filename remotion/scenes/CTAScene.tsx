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
import { BrowserFrame } from "../components/BrowserFrame";
import { PlayerMockup } from "../components/mockups/PlayerMockup";
import { AppSidebar } from "../components/AppSidebar";

const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "TailwindCSS",
  "Supabase",
  "Claude AI",
  "Groq Whisper",
];

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo
  const logoProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 15, stiffness: 100, mass: 0.5 },
  });

  // Title
  const titleProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });

  // CTA button
  const ctaProgress = spring({
    frame: frame - 35,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  // Button glow pulse
  const glowIntensity = interpolate(
    (frame - 40) % 45,
    [0, 22, 45],
    [0.3, 0.7, 0.3],
    { extrapolateLeft: "clamp" }
  );

  // Pulse ring
  const pulseScale = interpolate(frame % 60, [0, 60], [1, 3], {
    extrapolateRight: "clamp",
  });
  const pulseOpacity = interpolate(frame % 60, [0, 60], [0.3, 0], {
    extrapolateRight: "clamp",
  });

  // Screenshot float
  const screenshotFloat = Math.sin(frame * 0.03) * 5;

  return (
    <AbsoluteFill style={{ ...fullScreenStyle, background: COLORS.gradientHero }}>
      <GlowOrb color={COLORS.primary} size={600} x={600} y={100} />
      <GlowOrb color={COLORS.accentPink} size={400} x={200} y={600} delay={15} />
      <GlowOrb color={COLORS.accentCyan} size={350} x={1400} y={400} delay={30} />
      <ParticleField count={50} color="rgba(167, 139, 250, 0.3)" />

      {/* Grid overlay */}
      <div
        style={{
          ...fullScreenStyle,
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: 0.5,
        }}
      />

      {/* Left side - Player screenshot */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: "50%",
          transform: `translateY(${-50 + screenshotFloat}%) perspective(1200px) rotateY(5deg)`,
        }}
      >
        <BrowserFrame
          width={540}
          height={480}
          url="podcatch.app/episode/421/insights"
          delay={10}
          glowColor="rgba(124, 58, 237, 0.2)"
        >
          <div style={{ display: "flex", height: "100%" }}>
            <AppSidebar activeItem="Discover" />
            <PlayerMockup />
          </div>
        </BrowserFrame>
      </div>

      {/* Right side - CTA content */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: 0,
          height: "100%",
          width: 650,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo */}
        <div style={{ position: "relative", marginBottom: 32 }}>
          {/* Pulse ring */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 70,
              height: 70,
              borderRadius: "50%",
              border: `2px solid ${COLORS.primary}`,
              transform: `translate(-50%, -50%) scale(${pulseScale})`,
              opacity: pulseOpacity,
            }}
          />
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accentPink})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${interpolate(logoProgress, [0, 1], [0.5, 1])})`,
              opacity: interpolate(logoProgress, [0, 1], [0, 1]),
              boxShadow: `0 0 60px ${COLORS.primaryGlow}`,
            }}
          >
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: "white",
                fontFamily: FONTS.heading,
              }}
            >
              P
            </span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            fontFamily: FONTS.heading,
            color: COLORS.textPrimary,
            textAlign: "center",
            lineHeight: 1.15,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [40, 0])}px)`,
          }}
        >
          Your Podcasts,{"\n"}
          <span
            style={{
              background: COLORS.gradientPrimary,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Supercharged
          </span>
        </div>

        {/* CTA Button */}
        <div
          style={{
            marginTop: 40,
            opacity: interpolate(ctaProgress, [0, 1], [0, 1]),
            transform: `scale(${interpolate(ctaProgress, [0, 1], [0.8, 1])})`,
          }}
        >
          <div
            style={{
              padding: "16px 40px",
              borderRadius: 14,
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accentPink})`,
              fontSize: 20,
              fontWeight: 700,
              color: "white",
              fontFamily: FONTS.heading,
              letterSpacing: "1px",
              boxShadow: `0 0 ${40 + glowIntensity * 40}px ${COLORS.primaryGlow}`,
            }}
          >
            Try PodCatch Free
          </div>
        </div>

        {/* Tech stack pills */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 40,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {TECH_STACK.map((tech, i) => {
            const techProgress = spring({
              frame: frame - 50 - i * 4,
              fps,
              config: { damping: 20, stiffness: 120, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  background: `${COLORS.textPrimary}11`,
                  border: `1px solid ${COLORS.textPrimary}22`,
                  fontSize: 12,
                  fontWeight: 500,
                  color: COLORS.textSecondary,
                  fontFamily: FONTS.body,
                  opacity: interpolate(techProgress, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(techProgress, [0, 1], [10, 0])}px)`,
                }}
              >
                {tech}
              </div>
            );
          })}
        </div>

        {/* URL */}
        <div
          style={{
            marginTop: 32,
            fontSize: 16,
            color: COLORS.textMuted,
            fontFamily: FONTS.body,
            letterSpacing: "3px",
            opacity: interpolate(frame - 60, [0, 20], [0, 0.6], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          podcatch.app
        </div>
      </div>
    </AbsoluteFill>
  );
};
