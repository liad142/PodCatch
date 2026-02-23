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
import { ProgressBar } from "../components/ProgressBar";

const SUMMARY_ITEMS = [
  { icon: "lightning", label: "TLDR", text: "2-sentence summary in seconds" },
  { icon: "bullet", label: "Key Takeaways", text: "5-7 actionable bullet points" },
  { icon: "target", label: "Target Audience", text: "Know who should listen" },
  { icon: "tag", label: "Topic Tags", text: "Auto-categorized content" },
];

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

  // Mock UI card
  const cardProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  // Status bar animation (queued -> transcribing -> summarizing -> ready)
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
          width: 750,
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
            maxWidth: 600,
            opacity: interpolate(frame - 20, [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Multi-level AI summaries powered by Claude 3.5 &amp; Groq Whisper.
          Quick overviews or deep analysis — you choose.
        </div>

        {/* Processing status */}
        <div style={{ marginTop: 40 }}>
          <ProgressBar
            progress={statusProgress}
            label={statusLabel}
            color={statusColor}
            delay={20}
            width={550}
          />
        </div>
      </div>

      {/* Right side - Summary card mockup */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: "50%",
          transform: `translateY(-50%) scale(${interpolate(cardProgress, [0, 1], [0.85, 1])})`,
          opacity: interpolate(cardProgress, [0, 1], [0, 1]),
        }}
      >
        <div
          style={{
            width: 480,
            background: COLORS.bgCard,
            borderRadius: 20,
            border: `1px solid ${COLORS.bgAccent}`,
            overflow: "hidden",
            boxShadow: `0 0 80px ${COLORS.primaryGlow}, 0 30px 80px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: "20px 28px",
              borderBottom: `1px solid ${COLORS.bgAccent}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: COLORS.accentGreen,
                boxShadow: `0 0 10px ${COLORS.accentGreen}`,
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textPrimary,
                fontFamily: FONTS.body,
              }}
            >
              Quick Summary
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                fontFamily: FONTS.body,
              }}
            >
              Claude 3.5
            </span>
          </div>

          {/* Summary items */}
          <div style={{ padding: "20px 28px" }}>
            {SUMMARY_ITEMS.map((item, i) => {
              const itemProgress = spring({
                frame: frame - 30 - i * 8,
                fps,
                config: { damping: 20, stiffness: 100, mass: 0.6 },
              });

              const iconColors = [
                COLORS.accentOrange,
                COLORS.accentCyan,
                COLORS.accentPink,
                COLORS.primary,
              ];

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    marginBottom: 20,
                    opacity: interpolate(itemProgress, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(itemProgress, [0, 1], [20, 0])}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `${iconColors[i]}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: iconColors[i],
                      }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: COLORS.textPrimary,
                        fontFamily: FONTS.heading,
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: COLORS.textSecondary,
                        fontFamily: FONTS.body,
                      }}
                    >
                      {item.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
