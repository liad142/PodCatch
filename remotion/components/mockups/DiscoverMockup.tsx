import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

// Realistic podcast data
const DAILY_MIX = [
  {
    title: "The Future of AGI and Human Alignment",
    podcast: "Lex Fridman Podcast",
    date: "Today",
    color: "#1a1040",
    artBg: "linear-gradient(135deg, #2d1b69, #1a1040)",
    artLetter: "L",
    artColor: "#a78bfa",
  },
  {
    title: "Why Sleep is Your Superpower",
    podcast: "Huberman Lab",
    date: "Yesterday",
    color: "#0f2918",
    artBg: "linear-gradient(135deg, #065f46, #0f2918)",
    artLetter: "H",
    artColor: "#6ee7b7",
  },
  {
    title: "Building Products That Last",
    podcast: "Lenny's Podcast",
    date: "2 days ago",
    color: "#1e1a0a",
    artBg: "linear-gradient(135deg, #854d0e, #1e1a0a)",
    artLetter: "LP",
    artColor: "#fbbf24",
  },
];

const TOP_PODCASTS = [
  { name: "Joe Rogan", letter: "JR", bg: "#1e3a2f" },
  { name: "Lex Fridman", letter: "LF", bg: "#2d1b69" },
  { name: "Huberman", letter: "HL", bg: "#065f46" },
  { name: "All-In", letter: "AI", bg: "#1e293b" },
  { name: "My First Mil", letter: "FM", bg: "#7c2d12" },
  { name: "Diary of CEO", letter: "DC", bg: "#581c87" },
  { name: "Tim Ferriss", letter: "TF", bg: "#1e3a5f" },
];

export const DiscoverMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: "16px 18px", overflow: "hidden" }}>
        {/* Search bar */}
        <div
          style={{
            height: 32,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            marginBottom: 18,
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Inter, sans-serif", marginLeft: 8 }}>
            Search podcasts, topics, or episodes...
          </span>
        </div>

        {/* Daily Mix section */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
              Daily Mix
            </span>
            <span style={{ fontSize: 10, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              Curated for you
            </span>
          </div>

          {/* Carousel */}
          <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
            {DAILY_MIX.map((item, i) => {
              const cardP = spring({
                frame: frame - 5 - i * 6,
                fps,
                config: { damping: 20, stiffness: 100, mass: 0.6 },
              });

              return (
                <div
                  key={i}
                  style={{
                    width: 180,
                    height: 100,
                    borderRadius: 12,
                    background: item.color,
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: 12,
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                    opacity: interpolate(cardP, [0, 1], [0, 1]),
                    transform: `translateX(${interpolate(cardP, [0, 1], [20, 0])}px)`,
                  }}
                >
                  {/* Background blur effect */}
                  <div style={{
                    position: "absolute",
                    top: -20,
                    right: -20,
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: item.artBg,
                    opacity: 0.5,
                    filter: "blur(20px)",
                  }} />

                  <div style={{ position: "relative", zIndex: 1 }}>
                    {/* Date badge */}
                    <div style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.5)",
                      fontFamily: "Inter, sans-serif",
                      marginBottom: 6,
                    }}>
                      {item.date}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#F8FAFC",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.3,
                      marginBottom: 6,
                    }}>
                      {item.title}
                    </div>

                    {/* Podcast info row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: "auto" }}>
                      <div style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: item.artBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                        <span style={{ fontSize: 6, fontWeight: 800, color: item.artColor, fontFamily: "Inter, sans-serif" }}>
                          {item.artLetter}
                        </span>
                      </div>
                      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", fontFamily: "Inter, sans-serif" }}>
                        {item.podcast}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Podcasts */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif", marginBottom: 10 }}>
            Top Podcasts
          </div>
          <div style={{ display: "flex", gap: 14, overflow: "hidden" }}>
            {TOP_PODCASTS.map((p, i) => {
              const bP = spring({
                frame: frame - 15 - i * 3,
                fps,
                config: { damping: 20, stiffness: 120, mass: 0.5 },
              });

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    opacity: interpolate(bP, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(bP, [0, 1], [0.7, 1])})`,
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: p.bg,
                    border: "2px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.8)", fontFamily: "Inter, sans-serif" }}>
                      {p.letter}
                    </span>
                  </div>
                  <span style={{ fontSize: 7, color: "#94A3B8", fontFamily: "Inter, sans-serif", textAlign: "center", width: 44 }}>
                    {p.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Curiosity Feed */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif", marginBottom: 10 }}>
            Curiosity Feed
          </div>
          {[
            { title: "How to Build a Second Brain", podcast: "Ali Abdaal", dur: "1h 23m" },
            { title: "The Science of Motivation", podcast: "Andrew Huberman", dur: "2h 05m" },
          ].map((ep, i) => {
            const eP = spring({
              frame: frame - 25 - i * 6,
              fps,
              config: { damping: 20, stiffness: 100, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  background: "#1e202e",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  opacity: interpolate(eP, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(eP, [0, 1], [10, 0])}px)`,
                }}
              >
                {/* Artwork placeholder */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: `linear-gradient(135deg, ${i === 0 ? "#1e3a5f" : "#2d1b69"}, #1a1c2e)`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>
                    {ep.podcast[0]}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
                    {ep.title}
                  </div>
                  <div style={{ fontSize: 8, color: "#64748B", fontFamily: "Inter, sans-serif", marginTop: 2 }}>
                    {ep.podcast} · {ep.dur}
                  </div>
                </div>
                {/* Play button */}
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid white",
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    marginLeft: 1,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
