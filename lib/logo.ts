const FETCH_TIMEOUT_MS = 10_000;

// Logos are small; anything bigger is probably a hero image mis-detected as a
// logo. Cap it so lead.json (and the data URI baked into the page) stays lean.
const MAX_LOGO_BYTES = 500_000;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

/**
 * Download a logo and return it as a `data:` URI so the page can render it
 * without a live request to the lead's server. Many sites hotlink-protect their
 * assets — the logo loads server-side (curl, palette extraction) but a browser
 * request carrying our Referer is blocked, so the <img> breaks in the mockup.
 * Inlining sidesteps that and also survives the lead's site going down.
 *
 * Returns null on any failure — caller falls back to the remote URL.
 */
export async function fetchLogoDataUri(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;

  try {
    const res = await fetch(logoUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_LOGO_BYTES) return null;

    const mime = resolveMime(res.headers.get("content-type"), logoUrl);
    if (!mime) return null;

    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function resolveMime(contentType: string | null, url: string): string | null {
  const headerMime = contentType?.split(";")[0]?.trim().toLowerCase();
  if (headerMime?.startsWith("image/")) return headerMime;

  const ext = new URL(url).pathname.split(".").pop()?.toLowerCase();
  return (ext && MIME_BY_EXT[ext]) || null;
}
