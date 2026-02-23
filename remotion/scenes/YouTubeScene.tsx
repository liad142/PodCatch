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

const FEED_ITEMS = [
  { channel: "@mkbhd", title: "Galaxy S26 Ultra Review", time: "2h ago", type: "youtube" },
  { channel: "Lex Fridman", title: "AI Consciousness Deep Dive", time: "5h ago", type: "youtube" },
  { channel: "@veritasium", title: "The Paradox of Choice", time: "8h ago", type: "youtube" },
  { channel: "Huberman Lab", title: "Sleep Optimization Protocol", time: "1d ago", type: "podcast" },
];

export const YouTubeScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });

  return (
    <AbsoluteFill style={{ ...fullScreenStyle, background: COLORS.bgDark }}>
      <GlowOrb color={COLORS.accentRed} size={500} x={-150} y={-50} />
      <GlowOrb color={COLORS.accentOrange} size={350} x={1500} y={700} delay={15} />
      <ParticleField count={20} color="rgba(239, 68, 68, 0.2)" />

      {/* Right side - Text */}
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 0,
          height: "100%",
          width: 650,
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

      {/* Left side - Feed mockup */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <div
          style={{
            width: 520,
            background: COLORS.bgCard,
            borderRadius: 20,
            border: `1px solid ${COLORS.bgAccent}`,
            overflow: "hidden",
            boxShadow: `0 0 60px rgba(239, 68, 68, 0.1), 0 30px 80px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Feed header */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: `1px solid ${COLORS.bgAccent}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.accentGreen,
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
              Your Feed
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 12,
                color: COLORS.textMuted,
                fontFamily: FONTS.body,
              }}
            >
              4 new items
            </span>
          </div>

          {/* Feed items */}
          {FEED_ITEMS.map((item, i) => {
            const itemProgress = spring({
              frame: frame - 20 - i * 8,
              fps,
              config: { damping: 20, stiffness: 100, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  padding: "16px 24px",
                  borderBottom:
                    i < FEED_ITEMS.length - 1
                      ? `1px solid ${COLORS.bgAccent}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: interpolate(itemProgress, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(itemProgress, [0, 1], [15, 0])}px)`,
                }}
              >
                {/* Thumbnail placeholder */}
                <div
                  style={{
                    width: 64,
                    height: 42,
                    borderRadius: 8,
                    background:
                      item.type === "youtube"
                        ? `linear-gradient(135deg, ${COLORS.accentRed}44, ${COLORS.accentRed}22)`
                        : `linear-gradient(135deg, ${COLORS.primary}44, ${COLORS.primary}22)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderLeft: "10px solid white",
                      borderTop: "6px solid transparent",
                      borderBottom: "6px solid transparent",
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: COLORS.textPrimary,
                      fontFamily: FONTS.body,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: COLORS.textMuted,
                      fontFamily: FONTS.body,
                      marginTop: 2,
                    }}
                  >
                    {item.channel} &bull; {item.time}
                  </div>
                </div>
                {/* Bookmark icon */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0.4,
                    fontSize: 16,
                    color: COLORS.textSecondary,
                  }}
                >
                  ★
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
