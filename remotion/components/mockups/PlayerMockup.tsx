import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const CHAPTERS = [
  { time: "0:00", title: "Intro", end: 12 },
  { time: "12:15", title: "AI in Drug Discovery", end: 30 },
  { time: "30:30", title: "Protein Folding", end: 52 },
  { time: "52:45", title: "Scaling Laws", end: 67 },
  { time: "1:07:20", title: "Future of AI Research", end: 87 },
  { time: "1:27:00", title: "Ethics & Responsibility", end: 100 },
];

export const PlayerMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Simulated playback progress
  const playProgress = interpolate(frame, [0, 105], [28, 48], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Current chapter based on progress
  const currentChapterIndex = CHAPTERS.findIndex(
    (ch, i) => playProgress < ch.end
  );
  const activeIdx = currentChapterIndex === -1 ? CHAPTERS.length - 1 : currentChapterIndex;

  const panelP = spring({ frame: frame - 5, fps, config: { damping: 20, stiffness: 80, mass: 1 } });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Main content area with episode content behind */}
      <div style={{
        flex: 1,
        background: "#0f111a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
      }}>
        {/* Faded episode content in background */}
        <div style={{ padding: "14px 18px", opacity: 0.4 }}>
          <div style={{ fontSize: 8, color: "#64748B", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>Now Playing</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif", marginBottom: 4 }}>
            AI and the Future of Scientific Discovery
          </div>
          <div style={{ fontSize: 9, color: "#94A3B8", fontFamily: "Inter, sans-serif", lineHeight: 1.5 }}>
            In this episode, we explore how artificial intelligence is fundamentally changing the way scientists conduct research...
          </div>
        </div>

        {/* Player Panel - Expanded */}
        <div
          style={{
            background: "#1a1c2e",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px 14px 0 0",
            overflow: "hidden",
            opacity: interpolate(panelP, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(panelP, [0, 1], [30, 0])}px)`,
          }}
        >
          {/* Drag handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 2px" }}>
            <div style={{ width: 28, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Track info */}
          <div style={{ padding: "6px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2d1b69, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.9)", fontFamily: "Inter, sans-serif" }}>L</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
                AI and the Future of Scientific Discovery
              </div>
              <div style={{ fontSize: 8, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
                Lex Fridman Podcast
              </div>
            </div>
          </div>

          {/* Progress bar with chapter segments */}
          <div style={{ padding: "0 16px 6px" }}>
            <div style={{
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.08)",
              position: "relative",
              display: "flex",
              gap: 1,
              overflow: "hidden",
            }}>
              {CHAPTERS.map((ch, i) => {
                const width = i === 0 ? ch.end : ch.end - CHAPTERS[i - 1].end;
                const isFilled = playProgress >= ch.end;
                const isActive = i === activeIdx;
                const fillWidth = isActive
                  ? ((playProgress - (i === 0 ? 0 : CHAPTERS[i - 1].end)) / width) * 100
                  : 0;

                return (
                  <div
                    key={i}
                    style={{
                      flex: width,
                      height: "100%",
                      borderRadius: 1,
                      background: isFilled
                        ? "linear-gradient(90deg, #7C3AED, #A78BFA)"
                        : "rgba(255,255,255,0.06)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {isActive && (
                      <div style={{
                        width: `${fillWidth}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #7C3AED, #A78BFA)",
                        borderRadius: 1,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontSize: 7, color: "#64748B", fontFamily: "Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}>
                {Math.floor(playProgress * 1.54)}:{String(Math.floor((playProgress * 1.54 * 60) % 60)).padStart(2, "0")}
              </span>
              <span style={{ fontSize: 7, color: "#64748B", fontFamily: "Inter, sans-serif" }}>2:34:00</span>
            </div>
          </div>

          {/* Playback controls */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: "4px 0 10px",
          }}>
            {/* Speed */}
            <div style={{
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.08)",
              fontSize: 8,
              fontWeight: 700,
              color: "#A78BFA",
              fontFamily: "Inter, sans-serif",
            }}>
              1.5x
            </div>

            {/* Skip back */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round">
                <polyline points="11 17 6 12 11 7" />
                <text x="14" y="16" fontSize="8" fill="#94A3B8" fontFamily="Inter, sans-serif" fontWeight="700" stroke="none">15</text>
              </svg>
            </div>

            {/* Play/Pause button */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.4)",
            }}>
              {/* Pause icon (showing it's playing) */}
              <div style={{ display: "flex", gap: 3 }}>
                <div style={{ width: 3, height: 14, background: "white", borderRadius: 1 }} />
                <div style={{ width: 3, height: 14, background: "white", borderRadius: 1 }} />
              </div>
            </div>

            {/* Skip forward */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={2} strokeLinecap="round">
                <polyline points="13 17 18 12 13 7" />
                <text x="2" y="16" fontSize="8" fill="#94A3B8" fontFamily="Inter, sans-serif" fontWeight="700" stroke="none">15</text>
              </svg>
            </div>

            {/* Chapter button */}
            <div style={{
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.08)",
              fontSize: 8,
              fontWeight: 600,
              color: "#94A3B8",
              fontFamily: "Inter, sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}>
              <span style={{ fontSize: 8 }}>📑</span>
              <span>Ch.{activeIdx + 1}</span>
            </div>
          </div>

          {/* Chapter list */}
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            padding: "8px 12px",
            maxHeight: 160,
          }}>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#F8FAFC",
              fontFamily: "Inter, sans-serif",
              marginBottom: 6,
            }}>
              Chapters
            </div>
            {CHAPTERS.map((ch, i) => {
              const isActive = i === activeIdx;
              const isPast = i < activeIdx;
              const chP = spring({
                frame: frame - 15 - i * 4,
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
                    padding: "5px 8px",
                    borderRadius: 6,
                    background: isActive ? "rgba(124, 58, 237, 0.1)" : "transparent",
                    marginBottom: 2,
                    opacity: interpolate(chP, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(chP, [0, 1], [10, 0])}px)`,
                  }}
                >
                  {/* Status indicator */}
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isActive ? "#7C3AED" : isPast ? "#A78BFA" : "#27293d",
                    flexShrink: 0,
                    boxShadow: isActive ? "0 0 6px rgba(124, 58, 237, 0.5)" : "none",
                  }} />

                  <span style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: isActive ? "#A78BFA" : "#64748B",
                    fontFamily: "Inter, sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    width: 36,
                    flexShrink: 0,
                  }}>
                    {ch.time}
                  </span>
                  <span style={{
                    fontSize: 8,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "#F8FAFC" : "#94A3B8",
                    fontFamily: "Inter, sans-serif",
                    flex: 1,
                  }}>
                    {ch.title}
                  </span>
                  {isActive && (
                    <span style={{
                      fontSize: 6,
                      fontWeight: 700,
                      color: "#7C3AED",
                      background: "rgba(124, 58, 237, 0.2)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      fontFamily: "Inter, sans-serif",
                    }}>
                      NOW
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
