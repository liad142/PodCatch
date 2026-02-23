import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface BrowserFrameProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  url?: string;
  delay?: number;
  glowColor?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  children,
  width = 560,
  height = 480,
  url = "podcatch.app",
  delay = 10,
  glowColor = "rgba(124, 58, 237, 0.15)",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 80, mass: 1 },
  });

  return (
    <div
      style={{
        width,
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `scale(${interpolate(progress, [0, 1], [0.9, 1])})`,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: `0 0 80px ${glowColor}, 0 30px 80px rgba(0,0,0,0.6)`,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 40,
          background: "#1a1c2e",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 8,
        }}
      >
        {/* Traffic lights */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
        </div>

        {/* URL bar */}
        <div
          style={{
            flex: 1,
            height: 24,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: "0.5px",
            }}
          >
            {url}
          </span>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          height: height - 40,
          background: "#0f111a",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};
