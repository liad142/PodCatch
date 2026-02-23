import { CSSProperties } from "react";

// PodCatch brand colors - derived from the app's CSS variables
export const COLORS = {
  // Primary purple/violet palette
  primary: "#7C3AED", // violet-600
  primaryLight: "#A78BFA", // violet-400
  primaryDark: "#5B21B6", // violet-800
  primaryGlow: "rgba(124, 58, 237, 0.4)",

  // Dark theme background palette
  bgDark: "#0f111a",
  bgCard: "#1e202e",
  bgAccent: "#27293d",

  // Text
  textPrimary: "#F8FAFC", // slate-50
  textSecondary: "#94A3B8", // slate-400
  textMuted: "#64748B", // slate-500

  // Accent colors for features
  accentBlue: "#3B82F6",
  accentCyan: "#06B6D4",
  accentGreen: "#10B981",
  accentOrange: "#F59E0B",
  accentPink: "#EC4899",
  accentRed: "#EF4444",

  // Gradients
  gradientPrimary: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)",
  gradientDark: "linear-gradient(180deg, #0f111a 0%, #1e202e 100%)",
  gradientCard: "linear-gradient(135deg, #1e202e 0%, #27293d 100%)",
  gradientHero: "linear-gradient(135deg, #0f111a 0%, #1a103a 50%, #0f111a 100%)",
} as const;

export const FONTS = {
  heading: "Outfit, Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
  serif: "Crimson Text, Georgia, serif",
} as const;

// Shared base styles
export const fullScreenStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  position: "absolute",
  top: 0,
  left: 0,
};

export const centerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const columnCenterStyle: CSSProperties = {
  ...centerStyle,
  flexDirection: "column",
};
