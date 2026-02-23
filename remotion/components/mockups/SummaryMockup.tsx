import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const SummaryMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Progressive reveal
  const hookP = spring({ frame: frame - 5, fps, config: { damping: 22, stiffness: 100, mass: 0.7 } });
  const briefP = spring({ frame: frame - 15, fps, config: { damping: 22, stiffness: 100, mass: 0.7 } });
  const nuggetP = spring({ frame: frame - 25, fps, config: { damping: 22, stiffness: 100, mass: 0.7 } });
  const tagsP = spring({ frame: frame - 35, fps, config: { damping: 22, stiffness: 100, mass: 0.7 } });

  // Typing effect for executive brief
  const briefText = "This episode explores how frontier AI models are reshaping scientific discovery, from protein folding to drug design. The guest argues that the biggest breakthroughs will come not from scaling alone, but from combining AI with domain expertise.";
  const briefChars = Math.floor(
    interpolate(frame - 18, [0, 60], [0, briefText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const TAGS = ["AI Research", "Science", "Deep Learning", "Biotech", "Future of Work"];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* Content area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {/* Episode hero header */}
        <div style={{
          height: 80,
          background: "linear-gradient(180deg, #1a103a 0%, #0f111a 100%)",
          padding: "14px 18px",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Blurred bg glow */}
          <div style={{
            position: "absolute",
            top: -30,
            left: -30,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(124, 58, 237, 0.15)",
            filter: "blur(30px)",
          }} />

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
            {/* Podcast art */}
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2d1b69, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
            }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.9)", fontFamily: "Inter, sans-serif" }}>L</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, color: "#A78BFA", fontFamily: "Inter, sans-serif", fontWeight: 600, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>
                Lex Fridman Podcast · #421
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif", lineHeight: 1.2 }}>
                AI and the Future of Scientific Discovery
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>
                  Feb 20, 2026
                </span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", fontFamily: "Inter, sans-serif", background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>
                  2h 34m
                </span>
              </div>
            </div>

            {/* Play button */}
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.4)",
            }}>
              <div style={{
                width: 0,
                height: 0,
                borderLeft: "8px solid white",
                borderTop: "5px solid transparent",
                borderBottom: "5px solid transparent",
                marginLeft: 2,
              }} />
            </div>
          </div>
        </div>

        {/* Summary content */}
        <div style={{ padding: "14px 18px", overflow: "hidden" }}>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2, marginBottom: 14, background: "#1a1c2e", borderRadius: 8, padding: 2 }}>
            <div style={{
              padding: "5px 12px",
              borderRadius: 6,
              background: "rgba(124, 58, 237, 0.2)",
              border: "1px solid rgba(124, 58, 237, 0.3)",
              fontSize: 9,
              fontWeight: 600,
              color: "#A78BFA",
              fontFamily: "Inter, sans-serif",
            }}>
              Quick Summary
            </div>
            <div style={{
              padding: "5px 12px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 500,
              color: "#64748B",
              fontFamily: "Inter, sans-serif",
            }}>
              Deep Analysis
            </div>
          </div>

          {/* Hook headline */}
          <div
            style={{
              opacity: interpolate(hookP, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(hookP, [0, 1], [15, 0])}px)`,
            }}
          >
            <div style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#F8FAFC",
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.25,
              marginBottom: 12,
            }}>
              &ldquo;AI Won&apos;t Replace Scientists — It&apos;ll Give Them Superpowers&rdquo;
            </div>
          </div>

          {/* Executive brief */}
          <div
            style={{
              opacity: interpolate(briefP, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(briefP, [0, 1], [15, 0])}px)`,
            }}
          >
            <div style={{
              fontSize: 9,
              color: "#94A3B8",
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.6,
              marginBottom: 14,
            }}>
              {briefText.slice(0, briefChars)}
              {briefChars < briefText.length && (
                <span style={{ opacity: frame % 15 < 8 ? 1 : 0, color: "#7C3AED" }}>|</span>
              )}
            </div>
          </div>

          {/* Golden Nugget */}
          <div
            style={{
              opacity: interpolate(nuggetP, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(nuggetP, [0, 1], [15, 0])}px)`,
            }}
          >
            <div style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: 10,
              padding: "10px 12px",
              marginBottom: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                <span style={{ fontSize: 11 }}>✨</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#FBBF24", fontFamily: "Inter, sans-serif" }}>
                  Golden Nugget
                </span>
              </div>
              <div style={{
                fontSize: 9,
                color: "#FDE68A",
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.5,
              }}>
                The most transformative AI applications in science aren&apos;t the ones that automate existing processes — they&apos;re the ones that reveal patterns humans never thought to look for.
              </div>
            </div>
          </div>

          {/* Tags */}
          <div
            style={{
              display: "flex",
              gap: 5,
              flexWrap: "wrap",
              opacity: interpolate(tagsP, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(tagsP, [0, 1], [10, 0])}px)`,
            }}
          >
            {TAGS.map((tag, i) => (
              <div
                key={i}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(124, 58, 237, 0.1)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  fontSize: 8,
                  color: "#A78BFA",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
