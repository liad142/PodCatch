import React from "react";

const NAV_ITEMS = [
  { icon: "compass", label: "Discover", active: false },
  { icon: "radio", label: "My Podcasts", active: false },
  { icon: "file", label: "Summaries", active: false },
  { icon: "bookmark", label: "Saved", active: false },
  { icon: "settings", label: "Settings", active: false },
];

interface AppSidebarProps {
  activeItem?: string;
  compact?: boolean;
}

const SidebarIcon: React.FC<{ type: string; color: string; size?: number }> = ({
  type,
  color,
  size = 14,
}) => {
  const s = size;
  const common = { stroke: color, strokeWidth: 1.8, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (type === "compass") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={color} opacity={0.3} />
      </svg>
    );
  }
  if (type === "radio") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
      </svg>
    );
  }
  if (type === "file") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (type === "bookmark") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" {...common}>
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (type === "settings") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  return null;
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeItem = "Discover",
  compact = false,
}) => {
  return (
    <div
      style={{
        width: compact ? 48 : 48,
        height: "100%",
        background: "#141627",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 14,
        gap: 4,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "linear-gradient(135deg, #7C3AED, #EC4899)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 900, color: "white", fontFamily: "Inter, sans-serif" }}>P</span>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item, i) => {
        const isActive = item.label === activeItem;
        return (
          <div
            key={i}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isActive ? "rgba(124, 58, 237, 0.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <SidebarIcon
              type={item.icon}
              color={isActive ? "#A78BFA" : "#64748B"}
              size={16}
            />
          </div>
        );
      })}
    </div>
  );
};
