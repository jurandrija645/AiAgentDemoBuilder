import sharp from "sharp";

export interface PaletteResult {
  colors: string[];
  logoIsFallback: boolean;
}

const SAMPLE_SIZE = 40;
const BUCKET_STEP = 32; // quantize each channel to steps of 32 (8 buckets/channel)

/**
 * Downloads the logo and extracts 2-3 dominant colors by resizing to a small
 * thumbnail, quantizing pixels into RGB buckets, and taking the most frequent
 * buckets that aren't near-white/near-black/near-gray. Falls back to a
 * deterministic neutral palette (and logoIsFallback: true) on any failure.
 */
export async function extractPalette(
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

    const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return fallbackPalette(businessName);

    const colors = sorted.slice(0, 3).map((c) => rgbToHex(c.r, c.g, c.b));
    return { colors, logoIsFallback: false };
  } catch {
    return fallbackPalette(businessName);
  }
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
