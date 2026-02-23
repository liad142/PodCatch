import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const CHAPTERS = [
  { time: "0:00", title: "Introduction & Guest Background", duration: "12 min" },
  { time: "12:15", title: "How AI is Transforming Drug Discovery", duration: "18 min" },
  { time: "30:30", title: "The Protein Folding Revolution", duration: "22 min" },
  { time: "52:45", title: "Scaling Laws vs. Domain Expertise", duration: "15 min" },
  { time: "1:07:20", title: "Future of AI-Assisted Research", duration: "20 min" },
  { time: "1:27:00", title: "Ethics & Responsible AI in Science", duration: "14 min" },
];

const CORE_CONCEPTS = [
  { title: "AI + Domain Expertise", desc: "Why combining AI with human expertise yields better results than scaling alone", color: "#7C3AED" },
  { title: "Protein Folding", desc: "AlphaFold's impact on understanding biological structures", color: "#3B82F6" },
  { title: "Scaling Limitations", desc: "Where more compute doesn't equal better science", color: "#EC4899" },
];

export const InsightsMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Active chapter based on frame
  const activeChapter = Math.min(Math.floor(frame / 18), CHAPTERS.length - 1);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {/* Compact episode header */}
        <div style={{
          height: 44,
          background: "linear-gradient(180deg, #1a103a 0%, #0f111a 100%)",
          padding: "8px 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "linear-gradient(135deg, #2d1b69, #7C3AED)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.9)", fontFamily: "Inter, sans-serif" }}>L</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
              AI and the Future of Scientific Discovery
            </div>
            <div style={{ fontSize: 7, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
              Lex Fridman Podcast · 2h 34m
            </div>
          </div>
        </div>

        {/* Insights content - scrollable area */}
        <div style={{ padding: "12px 16px", overflow: "hidden" }}>
          {/* Section: Episode Chapters */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: "rgba(124, 58, 237, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: 9 }}>📑</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
                Episode Chapters
              </span>
              <span style={{ fontSize: 8, color: "#64748B", fontFamily: "Inter, sans-serif" }}>
                6 chapters
              </span>
            </div>

            {/* Chapter timeline */}
            <div style={{ position: "relative", paddingLeft: 16 }}>
              {/* Timeline line */}
              <div style={{
                position: "absolute",
                left: 5,
                top: 4,
                bottom: 4,
                width: 2,
                background: "rgba(124, 58, 237, 0.15)",
                borderRadius: 1,
              }}>
                {/* Progress fill */}
                <div style={{
                  width: "100%",
                  height: `${((activeChapter + 1) / CHAPTERS.length) * 100}%`,
                  background: "linear-gradient(180deg, #7C3AED, #EC4899)",
                  borderRadius: 1,
                  transition: "height 0.3s ease",
                }} />
              </div>

              {CHAPTERS.map((ch, i) => {
                const chP = spring({
                  frame: frame - 5 - i * 5,
                  fps,
                  config: { damping: 20, stiffness: 100, mass: 0.6 },
                });
                const isActive = i === activeChapter;
                const isPast = i < activeChapter;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      marginBottom: 8,
                      opacity: interpolate(chP, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(chP, [0, 1], [10, 0])}px)`,
                    }}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      position: "absolute",
                      left: 1,
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isActive ? "#7C3AED" : isPast ? "#A78BFA" : "#27293d",
                      border: isActive ? "2px solid #A78BFA" : "2px solid #27293d",
                      boxShadow: isActive ? "0 0 8px rgba(124, 58, 237, 0.5)" : "none",
                      marginTop: 2,
                    }} />

                    <div style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: isActive ? "rgba(124, 58, 237, 0.1)" : "transparent",
                      border: isActive ? "1px solid rgba(124, 58, 237, 0.2)" : "1px solid transparent",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 8,
                          fontWeight: 600,
                          color: isActive ? "#A78BFA" : "#64748B",
                          fontFamily: "Inter, sans-serif",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {ch.time}
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
                            textTransform: "uppercase",
                          }}>
                            Now
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 9,
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "#F8FAFC" : "#94A3B8",
                        fontFamily: "Inter, sans-serif",
                        marginTop: 2,
                      }}>
                        {ch.title}
                      </div>
                      <div style={{ fontSize: 7, color: "#64748B", fontFamily: "Inter, sans-serif", marginTop: 1 }}>
                        {ch.duration}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Concepts */}
          <div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}>
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background: "rgba(59, 130, 246, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ fontSize: 9 }}>💡</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
                Core Concepts
              </span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {CORE_CONCEPTS.map((c, i) => {
                const cP = spring({
                  frame: frame - 40 - i * 6,
                  fps,
                  config: { damping: 20, stiffness: 100, mass: 0.6 },
                });

                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: `${c.color}11`,
                      border: `1px solid ${c.color}33`,
                      opacity: interpolate(cP, [0, 1], [0, 1]),
                      transform: `translateY(${interpolate(cP, [0, 1], [10, 0])}px)`,
                    }}
                  >
                    <div style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: c.color,
                      fontFamily: "Inter, sans-serif",
                      marginBottom: 3,
                    }}>
                      {c.title}
                    </div>
                    <div style={{
                      fontSize: 7,
                      color: "#94A3B8",
                      fontFamily: "Inter, sans-serif",
                      lineHeight: 1.4,
                    }}>
                      {c.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
