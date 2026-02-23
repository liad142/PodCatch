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
import { SummaryMockup } from "../components/mockups/SummaryMockup";
import { AppSidebar } from "../components/AppSidebar";
import { ProgressBar } from "../components/ProgressBar";

export const AISummariesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section title
  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });

  // Badge
  const badgeProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 120, mass: 0.5 },
  });

  // Status bar animation
  const statusProgress = interpolate(frame, [25, 90], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const statusLabel =
    statusProgress < 25
      ? "Queued..."
      : statusProgress < 60
        ? "Transcribing..."
        : statusProgress < 90
          ? "Summarizing..."
          : "Ready!";

  const statusColor =
    statusProgress >= 90 ? COLORS.accentGreen : COLORS.primary;

  // Screenshot float
  const screenshotFloat = Math.sin(frame * 0.035) * 4;

  return (
    <AbsoluteFill style={{ ...fullScreenStyle, background: COLORS.bgDark }}>
      <GlowOrb color={COLORS.primary} size={500} x={1300} y={-100} />
      <GlowOrb color={COLORS.accentCyan} size={400} x={-150} y={500} delay={10} />
      <ParticleField count={20} color="rgba(124, 58, 237, 0.2)" />

      {/* Left side - Text content */}
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 0,
          height: "100%",
          width: 650,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Feature badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: `${COLORS.primary}22`,
            border: `1px solid ${COLORS.primary}44`,
            borderRadius: 20,
            padding: "8px 20px",
            marginBottom: 24,
            opacity: interpolate(badgeProgress, [0, 1], [0, 1]),
            transform: `scale(${interpolate(badgeProgress, [0, 1], [0.8, 1])})`,
            width: "fit-content",
          }}
        >
          <span style={{ fontSize: 14, color: COLORS.primaryLight, fontFamily: FONTS.body, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
            AI Summaries
          </span>
        </div>

        {/* Title */}
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
          Understand Any Episode{" "}
          <span
            style={{
              background: COLORS.gradientPrimary,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            in Seconds
          </span>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: COLORS.textSecondary,
            fontFamily: FONTS.body,
            lineHeight: 1.6,
            marginTop: 20,
            maxWidth: 550,
            opacity: interpolate(frame - 20, [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Hook headlines, executive briefs, golden nuggets, and deep analysis — all powered by Claude AI.
        </div>

        {/* Processing status */}
        <div style={{ marginTop: 40 }}>
          <ProgressBar
            progress={statusProgress}
            label={statusLabel}
            color={statusColor}
            delay={20}
            width={500}
          />
        </div>
      </div>

      {/* Right side - Real app Summary panel in browser frame */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: "50%",
          transform: `translateY(${-50 + screenshotFloat}%)`,
        }}
      >
        <BrowserFrame
          width={580}
          height={540}
          url="podcatch.app/episode/421/insights"
          delay={12}
          glowColor="rgba(124, 58, 237, 0.2)"
        >
          <div style={{ display: "flex", height: "100%" }}>
            <AppSidebar activeItem="Summaries" />
            <SummaryMockup />
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};
