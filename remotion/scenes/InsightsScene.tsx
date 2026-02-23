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
import { InsightsMockup } from "../components/mockups/InsightsMockup";
import { AppSidebar } from "../components/AppSidebar";

const INSIGHT_TABS = [
  { label: "Chapters", icon: "📑", color: COLORS.primary },
  { label: "Summary", icon: "📝", color: COLORS.accentBlue },
  { label: "Keywords", icon: "🔑", color: COLORS.accentGreen },
  { label: "Highlights", icon: "✨", color: COLORS.accentOrange },
  { label: "Mind Map", icon: "🧠", color: COLORS.accentPink },
  { label: "Transcript", icon: "📜", color: COLORS.accentCyan },
];

export const InsightsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });

  // Active tab cycles through
  const activeTab = Math.floor(frame / 20) % INSIGHT_TABS.length;

  // Screenshot float
  const screenshotFloat = Math.sin(frame * 0.035) * 4;

  return (
    <AbsoluteFill style={{ ...fullScreenStyle, background: COLORS.bgDark }}>
      <GlowOrb color={COLORS.accentPink} size={500} x={1300} y={-100} />
      <GlowOrb color={COLORS.accentGreen} size={400} x={-100} y={700} delay={10} />
      <ParticleField count={25} color="rgba(236, 72, 153, 0.2)" />

      {/* Left side - Title */}
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 0,
          height: "100%",
          width: 600,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            background: `${COLORS.accentPink}22`,
            border: `1px solid ${COLORS.accentPink}44`,
            borderRadius: 20,
            padding: "8px 20px",
            marginBottom: 24,
            width: "fit-content",
            opacity: interpolate(frame, [0, 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <span style={{ fontSize: 14, color: COLORS.accentPink, fontFamily: FONTS.body, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
            Insights Hub
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
          Chapters &amp; Deep{"\n"}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.accentPink}, ${COLORS.accentOrange})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Episode Insights
          </span>
        </div>

        <div
          style={{
            fontSize: 20,
            color: COLORS.textSecondary,
            fontFamily: FONTS.body,
            lineHeight: 1.6,
            marginTop: 20,
            opacity: interpolate(frame - 15, [0, 20], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          AI-generated chapters with timestamps, core concepts, and 6 analysis views — all on-demand.
        </div>

        {/* Animated tab bar */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 40,
            flexWrap: "wrap",
          }}
        >
          {INSIGHT_TABS.map((tab, i) => {
            const tabProgress = spring({
              frame: frame - 25 - i * 4,
              fps,
              config: { damping: 20, stiffness: 120, mass: 0.5 },
            });
            const isActive = i === activeTab;

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: isActive ? `${tab.color}33` : COLORS.bgCard,
                  border: `1px solid ${isActive ? tab.color : COLORS.bgAccent}`,
                  opacity: interpolate(tabProgress, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(tabProgress, [0, 1], [0.8, 1])})`,
                }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive ? tab.color : COLORS.textMuted,
                    fontFamily: FONTS.body,
                  }}
                >
                  {tab.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side - Real Episode Insights with chapters */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: "50%",
          transform: `translateY(${-50 + screenshotFloat}%)`,
        }}
      >
        <BrowserFrame
          width={600}
          height={540}
          url="podcatch.app/episode/421/insights"
          delay={10}
          glowColor="rgba(236, 72, 153, 0.12)"
        >
          <div style={{ display: "flex", height: "100%" }}>
            <AppSidebar activeItem="Summaries" />
            <InsightsMockup />
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};
