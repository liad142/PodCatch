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

const INSIGHT_TABS = [
  { label: "Summary", icon: "📝", color: COLORS.primary },
  { label: "Transcript", icon: "📜", color: COLORS.accentBlue },
  { label: "Keywords", icon: "🔑", color: COLORS.accentGreen },
  { label: "Highlights", icon: "✨", color: COLORS.accentOrange },
  { label: "Mind Map", icon: "🧠", color: COLORS.accentPink },
  { label: "Show Notes", icon: "📋", color: COLORS.accentCyan },
];

const KEYWORDS = [
  { word: "Machine Learning", count: 47, size: 28 },
  { word: "Neural Networks", count: 32, size: 22 },
  { word: "Transformer", count: 28, size: 20 },
  { word: "GPT", count: 24, size: 18 },
  { word: "Fine-tuning", count: 19, size: 16 },
  { word: "Attention", count: 16, size: 15 },
  { word: "Embeddings", count: 14, size: 14 },
  { word: "Inference", count: 12, size: 13 },
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
          width: 650,
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
          Deep Dive into{"\n"}
          <span
            style={{
              background: `linear-gradient(135deg, ${COLORS.accentPink}, ${COLORS.accentOrange})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Every Episode
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
          6 analysis views: transcripts, keywords, highlights, mind maps, and more. All generated on-demand with AI.
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

      {/* Right side - Keyword cloud mockup */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <div
          style={{
            width: 480,
            padding: 36,
            background: COLORS.bgCard,
            borderRadius: 20,
            border: `1px solid ${COLORS.bgAccent}`,
            boxShadow: `0 0 60px rgba(236, 72, 153, 0.1), 0 30px 80px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <span style={{ fontSize: 18 }}>🔑</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: COLORS.textPrimary,
                fontFamily: FONTS.heading,
              }}
            >
              Top Keywords
            </span>
          </div>

          {/* Keyword cloud */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {KEYWORDS.map((kw, i) => {
              const kwProgress = spring({
                frame: frame - 20 - i * 5,
                fps,
                config: { damping: 18, stiffness: 100, mass: 0.6 },
              });

              const colors = [
                COLORS.primary,
                COLORS.accentBlue,
                COLORS.accentGreen,
                COLORS.accentPink,
                COLORS.accentCyan,
                COLORS.accentOrange,
                COLORS.primaryLight,
                COLORS.accentRed,
              ];

              const floatY = Math.sin((frame + i * 15) * 0.05) * 3;

              return (
                <div
                  key={i}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: `${colors[i]}22`,
                    border: `1px solid ${colors[i]}44`,
                    opacity: interpolate(kwProgress, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(kwProgress, [0, 1], [0.5, 1])}) translateY(${floatY}px)`,
                  }}
                >
                  <span
                    style={{
                      fontSize: kw.size,
                      fontWeight: 600,
                      color: colors[i],
                      fontFamily: FONTS.body,
                    }}
                  >
                    {kw.word}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: COLORS.textMuted,
                      marginLeft: 6,
                      fontFamily: FONTS.body,
                    }}
                  >
                    {kw.count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mind map hint */}
          <div
            style={{
              marginTop: 24,
              padding: "12px 16px",
              borderRadius: 10,
              background: `${COLORS.accentPink}11`,
              border: `1px solid ${COLORS.accentPink}33`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: interpolate(frame - 60, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <span style={{ fontSize: 16 }}>🧠</span>
            <span
              style={{
                fontSize: 13,
                color: COLORS.textSecondary,
                fontFamily: FONTS.body,
              }}
            >
              Visual mind maps with Mermaid diagrams
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
