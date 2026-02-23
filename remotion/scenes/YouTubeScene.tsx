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
import { FeedMockup } from "../components/mockups/FeedMockup";
import { AppSidebar } from "../components/AppSidebar";

export const YouTubeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });

  // Screenshot float
  const screenshotFloat = Math.sin(frame * 0.035) * 4;

  return (
    <AbsoluteFill style={{ ...fullScreenStyle, background: COLORS.bgDark }}>
      <GlowOrb color={COLORS.accentRed} size={500} x={-150} y={-50} />
      <GlowOrb color={COLORS.accentOrange} size={350} x={1500} y={700} delay={15} />
      <ParticleField count={20} color="rgba(239, 68, 68, 0.2)" />

      {/* Left side - App screenshot */}
      <div
        style={{
          position: "absolute",
          left: 50,
          top: "50%",
          transform: `translateY(${-50 + screenshotFloat}%)`,
        }}
      >
        <BrowserFrame
          width={600}
          height={520}
          url="podcatch.app/discover"
          delay={8}
          glowColor="rgba(239, 68, 68, 0.12)"
        >
          <div style={{ display: "flex", height: "100%" }}>
            <AppSidebar activeItem="Discover" />
            <FeedMockup />
          </div>
        </BrowserFrame>
      </div>

      {/* Right side - Text */}
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 0,
          height: "100%",
          width: 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          textAlign: "right",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            background: `${COLORS.accentRed}22`,
            border: `1px solid ${COLORS.accentRed}44`,
            borderRadius: 20,
            padding: "8px 20px",
            marginBottom: 24,
            opacity: interpolate(frame, [0, 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span style={{ fontSize: 14, color: COLORS.accentRed, fontFamily: FONTS.body, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
            YouTube + Podcasts
          </span>
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            fontFamily: FONTS.heading,
            color: COLORS.textPrimary,
            lineHeight: 1.1,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [30, 0])}px)`,
          }}
        >
          Your{" "}
          <span style={{ color: COLORS.accentRed }}>Unified</span>
          {"\n"}Content Feed
        </div>

        <div
          style={{
            fontSize: 20,
            color: COLORS.textSecondary,
            fontFamily: FONTS.body,
            lineHeight: 1.6,
            marginTop: 20,
            maxWidth: 500,
            opacity: interpolate(frame - 15, [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Follow YouTube channels via RSSHub, bookmark videos, and blend everything into one smart feed.
        </div>

        {/* Feed mode pills */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 32,
          }}
        >
          {["Latest", "Following", "Bookmarked"].map((mode, i) => {
            const pillProgress = spring({
              frame: frame - 30 - i * 5,
              fps,
              config: { damping: 20, stiffness: 120, mass: 0.5 },
            });
            const isActive = i === 0;

            return (
              <div
                key={i}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  background: isActive ? COLORS.primary : COLORS.bgCard,
                  border: `1px solid ${isActive ? COLORS.primary : COLORS.bgAccent}`,
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? "white" : COLORS.textSecondary,
                  fontFamily: FONTS.body,
                  opacity: interpolate(pillProgress, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(pillProgress, [0, 1], [0.8, 1])})`,
                }}
              >
                {mode}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
