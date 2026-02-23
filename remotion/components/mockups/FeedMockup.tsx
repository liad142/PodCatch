import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const FEED_ITEMS = [
  {
    title: "Galaxy S26 Ultra — The AI Phone Era Begins",
    channel: "MKBHD",
    time: "2h ago",
    type: "youtube" as const,
    letter: "M",
    color: "#dc2626",
    bg: "#1a0f0f",
  },
  {
    title: "Consciousness, Free Will, and the Nature of AI",
    channel: "Lex Fridman Podcast",
    time: "5h ago",
    type: "youtube" as const,
    letter: "L",
    color: "#7C3AED",
    bg: "#1a1040",
  },
  {
    title: "The Paradox of Infinite Choice",
    channel: "Veritasium",
    time: "8h ago",
    type: "youtube" as const,
    letter: "V",
    color: "#f59e0b",
    bg: "#1a1505",
  },
  {
    title: "Sleep Optimization: Advanced Protocol",
    channel: "Huberman Lab",
    time: "1d ago",
    type: "podcast" as const,
    letter: "H",
    color: "#10b981",
    bg: "#0a1a12",
  },
  {
    title: "How I Built This: Airbnb with Brian Chesky",
    channel: "NPR",
    time: "1d ago",
    type: "podcast" as const,
    letter: "N",
    color: "#3b82f6",
    bg: "#0a1020",
  },
];

const SUBSCRIPTIONS = [
  { letter: "M", color: "#dc2626", name: "MKBHD" },
  { letter: "L", color: "#7C3AED", name: "Lex" },
  { letter: "V", color: "#f59e0b", name: "Veritasium" },
  { letter: "H", color: "#10b981", name: "Huberman" },
  { letter: "T", color: "#ec4899", name: "TED" },
];

export const FeedMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {/* Header with tabs */}
        <div style={{
          padding: "12px 18px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#F8FAFC",
            fontFamily: "Inter, sans-serif",
            marginBottom: 10,
          }}>
            Your Feed
          </div>

          {/* Subscribed channels */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            {SUBSCRIPTIONS.map((s, i) => {
              const sP = spring({
                frame: frame - i * 3,
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
                    gap: 3,
                    opacity: interpolate(sP, [0, 1], [0, 1]),
                    transform: `scale(${interpolate(sP, [0, 1], [0.7, 1])})`,
                  }}
                >
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid rgba(255,255,255,0.1)",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "white", fontFamily: "Inter, sans-serif" }}>
                      {s.letter}
                    </span>
                  </div>
                  <span style={{ fontSize: 6, color: "#64748B", fontFamily: "Inter, sans-serif" }}>{s.name}</span>
                </div>
              );
            })}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, paddingBottom: 8 }}>
            {["Latest", "Following", "Bookmarked"].map((tab, i) => {
              const isActive = i === 0;
              return (
                <div
                  key={i}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: isActive ? "#7C3AED" : "rgba(255,255,255,0.06)",
                    fontSize: 9,
                    fontWeight: 600,
                    color: isActive ? "white" : "#64748B",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {tab}
                </div>
              );
            })}
          </div>
        </div>

        {/* Feed items */}
        <div style={{ padding: "8px 14px", overflow: "hidden" }}>
          {FEED_ITEMS.map((item, i) => {
            const itemP = spring({
              frame: frame - 10 - i * 6,
              fps,
              config: { damping: 20, stiffness: 100, mass: 0.6 },
            });

            return (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "#1e202e",
                  border: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 6,
                  display: "flex",
                  gap: 10,
                  opacity: interpolate(itemP, [0, 1], [0, 1]),
                  transform: `translateY(${interpolate(itemP, [0, 1], [12, 0])}px)`,
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  width: item.type === "youtube" ? 70 : 44,
                  height: 44,
                  borderRadius: 8,
                  background: item.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: `${item.color}88`,
                    fontFamily: "Inter, sans-serif",
                  }}>
                    {item.letter}
                  </span>
                  {item.type === "youtube" && (
                    <div style={{
                      position: "absolute",
                      bottom: 3,
                      right: 3,
                      background: "rgba(0,0,0,0.7)",
                      borderRadius: 2,
                      padding: "1px 3px",
                      fontSize: 6,
                      color: "white",
                      fontFamily: "Inter, sans-serif",
                    }}>
                      ▶ YT
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#F8FAFC",
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.3,
                    marginBottom: 3,
                  }}>
                    {item.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 7, color: "#94A3B8", fontFamily: "Inter, sans-serif" }}>
                      {item.channel}
                    </span>
                    <span style={{ fontSize: 5, color: "#64748B" }}>•</span>
                    <span style={{ fontSize: 7, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
                      {item.time}
                    </span>
                    <div style={{ flex: 1 }} />
                    {/* Bookmark */}
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth={2} strokeLinecap="round">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
