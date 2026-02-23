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
import { DiscoverMockup } from "../components/mockups/DiscoverMockup";
import { AppSidebar } from "../components/AppSidebar";

const COUNTRIES = [
  { flag: "🇺🇸", name: "US" },
  { flag: "🇬🇧", name: "UK" },
  { flag: "🇮🇱", name: "Israel" },
  { flag: "🇩🇪", name: "Germany" },
  { flag: "🇯🇵", name: "Japan" },
];

export const PodcastDiscoveryScene: React.FC = () => {
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
          width: 620,
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
          Daily curated mixes, top charts, semantic search, and a curiosity feed that never stops.
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

      {/* Right side - Real app Discover page */}
      <div
        style={{
          position: "absolute",
          right: 40,
          top: "50%",
          transform: `translateY(${-50 + screenshotFloat}%)`,
        }}
      >
        <BrowserFrame
          width={620}
          height={520}
          url="podcatch.app/discover"
          delay={10}
          glowColor="rgba(59, 130, 246, 0.15)"
        >
          <div style={{ display: "flex", height: "100%" }}>
            <AppSidebar activeItem="Discover" />
            <DiscoverMockup />
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
};
