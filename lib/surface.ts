import type { CSSProperties } from "react";
import { hexToRgba } from "./color";
import { tokens, type Theme } from "./theme";

/**
 * Shared shell for the chat + voice panels. The panel has to separate from the
 * page on its own — on dark that means a lighter fill, on light a white card
 * with a shadow — plus a faint brand-tinted glow so it reads as the lead's.
 */
export function panelStyle(primary: string, theme?: Theme): CSSProperties {
  const t = tokens(theme);
  return {
    borderColor: t.panelBorder,
    background: `linear-gradient(180deg, ${t.panelBgFrom}, ${t.panelBgTo})`,
    boxShadow: [
      `inset 0 1px 0 ${t.panelHighlight}`,
      t.panelShadow,
      `0 0 48px -26px ${hexToRgba(primary, 0.75)}`,
    ].join(", "),
  };
}

/** Header strip of a panel — one step off the body, so the title separates. */
export function panelHeaderStyle(theme?: Theme): CSSProperties {
  const t = tokens(theme);
  return { borderColor: t.headerBorder, background: t.headerBg };
}
