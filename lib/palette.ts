import sharp from "sharp";

export interface PaletteResult {
  colors: string[];
  logoIsFallback: boolean;
}

const SAMPLE_SIZE = 40;
const BUCKET_STEP = 32; // quantize each channel to steps of 32 (8 buckets/channel)

const MIN_COLOR_OCCURRENCES = 2;
const MIN_COLOR_DISTANCE = 60; // RGB units — below this two colors read as the same
const MAX_ACCENT_HUE_SHIFT = 60; // degrees a site accent may sit from the primary

/**
 * Palettes that ship with tooling rather than belonging to the brand. These
 * appear on thousands of unrelated sites and are frequent enough to outrank the
 * real brand color, so they're excluded from frequency scoring. Colors a site
 * declares explicitly (theme-color, CSS brand variables) bypass this list —
 * if a brand really is WordPress orange, it will say so there.
 */
const BOILERPLATE_COLORS = new Set([
  // WordPress / Gutenberg default palette and preset gradient endpoints
  "#ff6900", "#fcb900", "#7bdcb5", "#00d084", "#8ed1fc", "#0693e3",
  "#abb8c3", "#eb144c", "#f78da7", "#9b51e0", "#313131", "#32373c",
  "#cf2e2e", "#2874fc", "#020381", "#a9b8c3",
  // Google brand set, pulled in by Maps / reCAPTCHA / sign-in widgets
  "#4285f4", "#ea4335", "#fbbc05", "#34a853",
]);

/**
 * Picks the lead's brand colors.
 *
 * Site CSS wins over the logo: a logo is often a tiny thumbnail, a photo, or a
 * mark whose incidental colors (a gold ring, a drop shadow) aren't the brand
 * at all, whereas the colors a site actually paints across its pages are the
 * brand as visitors experience it. The logo is the fallback, and a
 * deterministic name-based palette the last resort.
 *
 * `logoIsFallback` stays tied to the logo specifically — the hero uses it to
 * decide between showing the real logo and a generated badge.
 */
export async function extractPalette(
  logoUrl: string | null,
  businessName: string,
  siteColors: string[] = [],
): Promise<PaletteResult> {
  const fromLogo = await paletteFromLogo(logoUrl, businessName);
  if (siteColors.length === 0) return fromLogo;

  // The site's strongest color leads — it drives the headline, buttons and
  // avatars, so it matters most.
  const [primary, ...restOfSite] = siteColors;
  const primaryRgb = parseColor(primary);

  // Secondary site colors are only worth taking if they sit near the primary on
  // the wheel. A page's other real colors are often an unrelated alert red or
  // link blue, and the page renders these as gradients — pairing a brand green
  // with a stray red reads as a mistake, not as branding. The logo's colors are
  // trusted regardless: they're the brand mark, so a blue/yellow logo is meant
  // to clash.
  const harmoniousSiteColors = primaryRgb
    ? restOfSite.filter((hex) => {
        const rgb = parseColor(hex);
        return rgb ? hueDistance(hueOf(primaryRgb), hueOf(rgb)) <= MAX_ACCENT_HUE_SHIFT : false;
      })
    : restOfSite;

  const merged: string[] = [];
  for (const hex of [primary, ...harmoniousSiteColors, ...fromLogo.colors]) {
    const rgb = parseColor(hex);
    if (!rgb) continue;
    const tooSimilar = merged.some((m) => {
      const seen = parseColor(m);
      return seen ? colorDistance(seen, rgb) < MIN_COLOR_DISTANCE : false;
    });
    if (!tooSimilar) merged.push(hex);
    if (merged.length === 3) break;
  }

  // Nothing harmonised — build the accent from the primary so gradients still
  // have somewhere to travel.
  if (merged.length < 2 && primaryRgb) merged.push(lighten(primaryRgb, 0.45));

  return { colors: merged, logoIsFallback: fromLogo.logoIsFallback };
}

function hueOf({ r, g, b }: Rgb): number {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const chroma = max - Math.min(rn, gn, bn);
  if (chroma === 0) return 0;

  const h = max === rn ? ((gn - bn) / chroma) % 6 : max === gn ? (bn - rn) / chroma + 2 : (rn - gn) / chroma + 4;
  return (h * 60 + 360) % 360;
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function lighten({ r, g, b }: Rgb, amount: number): string {
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return rgbToHex(mix(r), mix(g), mix(b));
}

async function paletteFromLogo(
  logoUrl: string | null,
  businessName: string,
): Promise<PaletteResult> {
  if (!logoUrl) return fallbackPalette(businessName);

  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return fallbackPalette(businessName);
    const buffer = Buffer.from(await res.arrayBuffer());

    const { data, info } = await sharp(buffer)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
    const channels = info.channels; // 4 (RGBA) after ensureAlpha

    for (let i = 0; i < data.length; i += channels) {
      const alpha = data[i + 3];
      if (alpha < 128) continue; // skip transparent pixels

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isNearWhiteBlackOrGray(r, g, b)) continue;

      const key = `${quantize(r)},${quantize(g)},${quantize(b)}`;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }

    // Pixel count alone crowns whatever fills the most area — usually a pale
    // backing shape, not the mark itself. Weighting by vividness picks the color
    // the logo actually leads with.
    const sorted = Array.from(buckets.values())
      .map((c) => ({ ...c, score: c.count * vividness(c.r, c.g, c.b) }))
      .sort((a, b) => b.score - a.score);
    if (sorted.length === 0) return fallbackPalette(businessName);

    const colors: string[] = [];
    for (const color of sorted) {
      const tooSimilar = colors.some((hex) => {
        const seen = parseColor(hex);
        return seen ? colorDistance(seen, color) < MIN_COLOR_DISTANCE : false;
      });
      if (!tooSimilar) colors.push(rgbToHex(color.r, color.g, color.b));
      if (colors.length === 3) break;
    }
    return { colors, logoIsFallback: false };
  } catch {
    return fallbackPalette(businessName);
  }
}

/**
 * Pull brand colors out of a page's markup and CSS, strongest signal first:
 *
 *  1. `<meta name="theme-color">` — the brand color, stated outright.
 *  2. CSS custom properties named for the brand (`--primary`, `--brand-accent`).
 *  3. Frequency across the page, weighted by vividness.
 *
 * The first two are declarations of intent and are taken at face value. Raw
 * frequency is the weakest signal — the most-repeated values on a page are
 * usually tooling defaults and body-text grays, not the brand — so it only
 * fills whatever slots the declared colors left open.
 */
export function extractSiteColors(html: string, limit = 3): string[] {
  const declared = [...themeColors(html), ...brandVariableColors(html)];
  const counts = new Map<string, { r: number; g: number; b: number; count: number }>();

  const add = (r: number, g: number, b: number) => {
    if (isNearWhiteBlackOrGray(r, g, b)) return;
    const key = rgbToHex(r, g, b);
    if (BOILERPLATE_COLORS.has(key)) return;
    const seen = counts.get(key);
    if (seen) seen.count += 1;
    else counts.set(key, { r, g, b, count: 1 });
  };

  // The lookbehind skips HTML numeric entities: `&#038;` is an ampersand, not
  // the color #003388.
  for (const [, hex] of html.matchAll(/(?<!&)#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    add(
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    );
  }

  for (const m of html.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi)) {
    add(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  const all = Array.from(counts.values());

  // A color used once is noise — a stray icon fill, an error state. Requiring a
  // real share of usage keeps the palette to colors the brand actually leads with.
  const topCount = all.length ? Math.max(...all.map((c) => c.count)) : 0;
  const minCount = Math.max(MIN_COLOR_OCCURRENCES, topCount * 0.08);

  const byFrequency = all
    .filter((c) => c.count >= minCount)
    .map((c) => ({ ...c, score: c.count * vividness(c.r, c.g, c.b) }))
    .sort((a, b) => b.score - a.score);

  const picked: { r: number; g: number; b: number }[] = [];
  for (const color of [...declared, ...byFrequency]) {
    // Compare whole colors, not just hue: a brand's deep blue and its pale tint
    // share a hue but read as two distinct colors, and both belong.
    const tooSimilar = picked.some((p) => colorDistance(p, color) < MIN_COLOR_DISTANCE);
    if (!tooSimilar) picked.push(color);
    if (picked.length === limit) break;
  }

  return picked.map((c) => rgbToHex(c.r, c.g, c.b));
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `<meta name="theme-color" content="#0057b8">` — the brand color, stated outright. */
function themeColors(html: string): Rgb[] {
  const out: Rgb[] = [];
  for (const m of html.matchAll(
    /<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/gi,
  )) {
    const rgb = parseColor(m[1]);
    if (rgb && !isNearWhiteBlackOrGray(rgb.r, rgb.g, rgb.b)) out.push(rgb);
  }
  return out;
}

/** CSS custom properties a theme names for its brand, e.g. `--nv-primary-accent: #00b400`. */
function brandVariableColors(html: string): Rgb[] {
  const out: Rgb[] = [];
  for (const m of html.matchAll(
    /--[\w-]*(?:primary|brand|accent)[\w-]*\s*:\s*(#[0-9a-f]{3,6}|rgba?\([^)]+\))/gi,
  )) {
    const rgb = parseColor(m[1]);
    if (rgb && !isNearWhiteBlackOrGray(rgb.r, rgb.g, rgb.b)) out.push(rgb);
  }
  return out;
}

function parseColor(value: string): Rgb | null {
  const text = value.trim();

  const hex = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(text);
  if (hex) {
    const full =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(text);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };

  return null;
}

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Favors saturated, mid-lightness colors — the ones a brand actually leads with. */
function vividness(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const lightness = (max + min) / 2;
  const chroma = max - min;
  const saturation = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * lightness - 1));

  // Peaks around 50% lightness, tapering off toward white and black.
  const lightnessWeight = 1 - Math.abs(lightness - 0.5) * 1.5;
  return saturation * Math.max(lightnessWeight, 0.15);
}

function quantize(value: number): number {
  return Math.round(value / BUCKET_STEP) * BUCKET_STEP;
}

const MIN_SATURATION = 0.2;

/** Filters out near-white, near-black, and low-saturation (washed-out gray) pixels. */
function isNearWhiteBlackOrGray(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  const isNearWhite = lightness > 0.92;
  const isNearBlack = lightness < 0.1;
  if (isNearWhite || isNearBlack) return true;

  const chroma = max - min;
  const saturation = chroma === 0 ? 0 : chroma / (255 - Math.abs(max + min - 255));
  return saturation < MIN_SATURATION;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const NEUTRAL_PALETTES = [
  ["#334155", "#64748b"], // slate
  ["#1e3a8a", "#3b82f6"], // blue
  ["#134e4a", "#14b8a6"], // teal
  ["#3730a3", "#818cf8"], // indigo
  ["#7c2d12", "#ea580c"], // orange
];

function fallbackPalette(businessName: string): PaletteResult {
  return { colors: neutralPaletteForName(businessName), logoIsFallback: true };
}

/** Deterministically pick a neutral palette from a business name, so the same lead always gets the same look. */
function neutralPaletteForName(name: string): string[] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % NEUTRAL_PALETTES.length;
  return NEUTRAL_PALETTES[index];
}
