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

const GENRES = [
  { name: "Technology", emoji: "💻", color: COLORS.accentBlue },
  { name: "Business", emoji: "💼", color: COLORS.accentGreen },
  { name: "Science", emoji: "🔬", color: COLORS.accentCyan },
  { name: "Comedy", emoji: "😂", color: COLORS.accentOrange },
  { name: "True Crime", emoji: "🔍", color: COLORS.accentRed },
  { name: "Health", emoji: "❤️", color: COLORS.accentPink },
];

const COUNTRIES = [
  { flag: "🇺🇸", name: "US" },
  { flag: "🇬🇧", name: "UK" },
  { flag: "🇮🇱", name: "Israel" },
  { flag: "🇩🇪", name: "Germany" },
  { flag: "🇯🇵", name: "Japan" },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export const PodcastDiscoveryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 25, stiffness: 100, mass: 0.8 },
  });

  return (
    <AbsoluteFill style={{ ...fullScreenStyle, background: COLORS.bgDark }}>
      <GlowOrb color={COLORS.accentBlue} size={500} x={1400} y={100} />
      <GlowOrb color={COLORS.primary} size={400} x={-100} y={600} delay={10} />
      <ParticleField count={25} color="rgba(59, 130, 246, 0.25)" />

      {/* Left side - Title and country pills */}
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 0,
          height: "100%",
          width: 700,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            background: `${COLORS.accentBlue}22`,
            border: `1px solid ${COLORS.accentBlue}44`,
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
          <span style={{ fontSize: 14, color: COLORS.accentBlue, fontFamily: FONTS.body, fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase" }}>
            Discovery
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
          Explore{" "}
          <span style={{ color: COLORS.accentBlue }}>Every Genre</span>
          {"\n"}from{" "}
          <span style={{ color: COLORS.accentCyan }}>Every Country</span>
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
          Browse Apple Podcasts with 18 genres, top charts from 15+ countries, and instant search.
        </div>

        {/* Country pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
            flexWrap: "wrap",
          }}
        >
          {COUNTRIES.map((country, i) => {
            const pillProgress = spring({
              frame: frame - 25 - i * 5,
              fps,
              config: { damping: 20, stiffness: 120, mass: 0.5 },
            });

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: COLORS.bgCard,
                  border: `1px solid ${COLORS.bgAccent}`,
                  borderRadius: 12,
                  padding: "10px 18px",
                  opacity: interpolate(pillProgress, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(pillProgress, [0, 1], [0.7, 1])})`,
                }}
              >
                <span style={{ fontSize: 20 }}>{country.flag}</span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    fontFamily: FONTS.body,
                  }}
                >
                  {country.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side - Genre grid */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: "50%",
          transform: "translateY(-50%)",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {GENRES.map((genre, i) => {
          const cardProgress = spring({
            frame: frame - 15 - i * 6,
            fps,
            config: { damping: 18, stiffness: 100, mass: 0.6 },
          });

          // Float animation
          const floatY = Math.sin((frame + i * 20) * 0.04) * 4;

          return (
            <div
              key={i}
              style={{
                width: 220,
                padding: "24px 20px",
                borderRadius: 16,
                background: COLORS.bgCard,
                border: `1px solid ${COLORS.bgAccent}`,
                opacity: interpolate(cardProgress, [0, 1], [0, 1]),
                transform: `scale(${interpolate(cardProgress, [0, 1], [0.8, 1])}) translateY(${floatY}px)`,
                boxShadow: `0 0 30px ${genre.color}15`,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>{genre.emoji}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: genre.color,
                  fontFamily: FONTS.heading,
                }}
              >
                {genre.name}
              </div>
              {/* Fake podcast count */}
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  fontFamily: FONTS.body,
                  marginTop: 4,
                }}
              >
                {Math.round(seededRandom(i * 7 + 3) * 500 + 100)} podcasts
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
