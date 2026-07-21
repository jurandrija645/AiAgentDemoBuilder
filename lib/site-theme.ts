import { hexToRgb } from "./color";
import type { Theme } from "./theme";

/**
 * Decide whether a lead's site reads light or dark, so the mockup can match it.
 *
 * Reads the background declared for `body`/`html` where we can find it, and
 * falls back to `color-scheme`. The vast majority of business sites are light,
 * so an unreadable page defaults to light rather than to our old always-dark
 * behaviour — being wrong toward light is the safer miss.
 */
export function detectSiteTheme(html: string): Theme {
  const declared = bodyBackground(html);
  if (declared !== null) return luminance(declared) < 0.5 ? "dark" : "light";

  if (/color-scheme\s*:\s*[^;]*\bdark\b/i.test(html) && !/color-scheme\s*:\s*[^;]*\blight\b/i.test(html)) {
    return "dark";
  }

  return "light";
}

/** The background color a stylesheet sets on body/html, if it states one plainly. */
function bodyBackground(html: string): { r: number; g: number; b: number } | null {
  const rules = html.matchAll(
    /(?:^|[},])\s*(?:html|body)[^{}]*\{([^{}]*)\}/gi,
  );

  for (const rule of rules) {
    const body = rule[1];
    const decl = /background(?:-color)?\s*:\s*([^;!}]+)/i.exec(body);
    if (!decl) continue;

    const color = parseCssColor(decl[1]);
    if (color) return color;
  }
  return null;
}

function parseCssColor(value: string): { r: number; g: number; b: number } | null {
  const text = value.trim().toLowerCase();

  if (text.startsWith("#")) {
    const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})\b/.exec(text);
    return hex ? hexToRgb(hex[1]) : null;
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(text);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };

  if (text.startsWith("white")) return { r: 255, g: 255, b: 255 };
  if (text.startsWith("black")) return { r: 0, g: 0, b: 0 };

  return null;
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
