import { hexToRgb, hexToRgba } from "./color";

export type Theme = "dark" | "light";

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * Every surface color the lead page paints, so the same components render on a
 * dark or a light page. Brand colors stay separate — those come from the lead's
 * palette and sit on top of these.
 */
export interface ThemeTokens {
  /** Base page color, under the brand-tinted gradients. */
  pageBg: string;
  /** Alpha applied to the brand color in the page's corner glows. */
  pageGlow: number;
  gridLine: string;
  gridOpacity: string;

  textPrimary: string;
  textSecondary: string;
  textFaint: string;

  panelBgFrom: string;
  panelBgTo: string;
  panelBorder: string;
  panelHighlight: string;
  panelShadow: string;
  /** Solid color matching the panel — used where a ring must read as cut out of it. */
  panelSolid: string;

  headerBorder: string;
  headerBg: string;

  bubbleBg: string;
  bubbleText: string;

  inputBorder: string;
  inputText: string;
  placeholder: string;

  divider: string;
}

const DARK: ThemeTokens = {
  pageBg: "#06070c",
  pageGlow: 0.35,
  gridLine: "#fff",
  gridOpacity: "opacity-[0.06]",

  textPrimary: "#f5f5f7",
  textSecondary: hexToRgba("#ffffff", 0.7),
  textFaint: hexToRgba("#ffffff", 0.45),

  panelBgFrom: hexToRgba("#1e2635", 0.94),
  panelBgTo: hexToRgba("#12161f", 0.94),
  panelBorder: hexToRgba("#ffffff", 0.19),
  panelHighlight: hexToRgba("#ffffff", 0.08),
  panelShadow: "0 24px 48px -24px rgba(0, 0, 0, 0.9)",
  panelSolid: "#12161f",

  headerBorder: hexToRgba("#ffffff", 0.11),
  headerBg: hexToRgba("#ffffff", 0.05),

  bubbleBg: hexToRgba("#ffffff", 0.06),
  bubbleText: "#e5e5ea",

  inputBorder: hexToRgba("#ffffff", 0.15),
  inputText: "#ffffff",
  placeholder: hexToRgba("#ffffff", 0.4),

  divider: hexToRgba("#ffffff", 0.08),
};

const INK = "#0f172a";

const LIGHT: ThemeTokens = {
  pageBg: "#f6f8fc",
  // Tints on white go muddy fast, so the glows are far weaker than on dark.
  pageGlow: 0.14,
  gridLine: "#0f172a",
  gridOpacity: "opacity-[0.05]",

  textPrimary: INK,
  textSecondary: hexToRgba(INK, 0.72),
  textFaint: hexToRgba(INK, 0.45),

  panelBgFrom: "#ffffff",
  panelBgTo: hexToRgba("#f1f5f9", 0.95),
  panelBorder: hexToRgba(INK, 0.14),
  panelHighlight: hexToRgba("#ffffff", 0.9),
  panelShadow: "0 24px 48px -28px rgba(15, 23, 42, 0.28)",
  panelSolid: "#ffffff",

  headerBorder: hexToRgba(INK, 0.09),
  headerBg: hexToRgba(INK, 0.035),

  bubbleBg: hexToRgba(INK, 0.06),
  bubbleText: "#1e293b",

  inputBorder: hexToRgba(INK, 0.16),
  inputText: INK,
  placeholder: hexToRgba(INK, 0.42),

  divider: hexToRgba(INK, 0.1),
};

export function tokens(theme: Theme | undefined): ThemeTokens {
  return theme === "light" ? LIGHT : DARK;
}

/**
 * Brand colors are picked off the lead's own site, which usually means they were
 * chosen to sit on white — so on a light page a pale brand color can vanish
 * against the background. Darkens just enough to stay legible; a no-op on dark.
 */
export function onTheme(hex: string, theme: Theme | undefined): string {
  if (theme !== "light") return hex;

  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance <= 0.62) return hex;

  const factor = 0.62 / luminance;
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c * factor)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
