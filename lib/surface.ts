import type { CSSProperties } from "react";
import { hexToRgba } from "./color";

/**
 * Shared shell for the chat + voice panels. On the near-black page background
 * a flat translucent card disappears, so the panels get a lighter fill, a
 * top highlight, and a faint brand-tinted glow — enough to read as live
 * surfaces without competing with the headline.
 */
export function panelStyle(primary: string): CSSProperties {
  return {
    borderColor: hexToRgba("#ffffff", 0.19),
    background: `linear-gradient(180deg, ${hexToRgba("#1e2635", 0.94)}, ${hexToRgba("#12161f", 0.94)})`,
    boxShadow: [
      `inset 0 1px 0 ${hexToRgba("#ffffff", 0.08)}`,
      "0 24px 48px -24px rgba(0, 0, 0, 0.9)",
      `0 0 48px -26px ${hexToRgba(primary, 0.75)}`,
    ].join(", "),
  };
}

/** Header strip of a panel — one step lighter again, so the title separates. */
export function panelHeaderStyle(): CSSProperties {
  return {
    borderColor: hexToRgba("#ffffff", 0.11),
    background: hexToRgba("#ffffff", 0.05),
  };
}
