import * as cheerio from "cheerio";

import { extractSiteColors } from "./palette";
import { detectSiteTheme } from "./site-theme";
import type { Theme } from "./theme";

// Plenty of small-business sites sit behind a WAF that 403s anything
// self-identifying as a bot, so a bot string just means we can't read the same
// public marketing page a browser would load fine.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const BROWSER_HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export class ScrapeBlockedError extends Error {}

export interface ScrapedSite {
  businessName: string | null;
  logoUrl: string | null;
  metaDescription: string | null;
  /** The site's declared language, e.g. "es-ES" or "nl" — used to localize the page. */
  lang: string | null;
  /** Brand colors read from the page's own CSS — a better signal than the logo alone. */
  siteColors: string[];
  /** Whether the lead's own site reads light or dark. */
  theme: Theme;
}

export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const businessName =
    $('meta[property="og:site_name"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    null;

  const lang =
    $("html").attr("lang")?.trim() ||
    $('meta[property="og:locale"]').attr("content")?.trim() ||
    null;

  const metaDescription =
    cleanDescription($('meta[property="og:description"]').attr("content")) ??
    cleanDescription($('meta[name="description"]').attr("content"));

  const logoUrl = resolveLogoUrl($, url);
  const siteColors = extractSiteColors(html);
  const theme = detectSiteTheme(html);

  return { businessName, logoUrl, metaDescription, lang, siteColors, theme };
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Runs twice: some CMSs store already-escaped text, so `&amp;nbsp;` is common. */
function decodeEntities(text: string): string {
  let out = text;
  for (let pass = 0; pass < 2; pass++) {
    out = out.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
      if (code.startsWith("#")) {
        const num =
          code[1]?.toLowerCase() === "x"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        return Number.isFinite(num) ? String.fromCodePoint(num) : match;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    });
  }
  return out;
}

/**
 * The hero shows this as the lead's own pitch, so it has to be a real sentence.
 * Some sites ship a description that is just spacer entities with the company
 * name buried in it — worse than showing nothing, since the page then has our
 * copy rendered as literal `&nbsp;`. Returning null lets the hero use its
 * localized fallback line instead.
 */
function cleanDescription(raw: string | undefined): string | null {
  if (!raw) return null;

  const text = decodeEntities(raw).replace(/\s+/gu, " ").trim();
  const words = text.split(" ").filter((w) => /\p{L}{2,}/u.test(w));
  if (text.length < 40 || words.length < 6) return null;

  return text;
}

async function fetchHtml(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new ScrapeBlockedError(
      `Could not reach ${url}: ${(err as Error).message}`,
    );
  }
  if (!res.ok) {
    throw new ScrapeBlockedError(`${url} responded with HTTP ${res.status}`);
  }
  return res.text();
}

function resolveLogoUrl($: cheerio.CheerioAPI, baseUrl: string): string | null {
  const candidates: { href: string; score: number }[] = [];

  // Real site icons are almost always the actual brand mark; og:image is
  // frequently a wide marketing screenshot, so any icon outranks it.
  $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each(
    (_, el) => {
      const href = $(el).attr("href");
      if (href) candidates.push({ href, score: 4 });
    },
  );

  $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const sizes = $(el).attr("sizes") ?? "";
    const sizeMatch = sizes.match(/\d+/);
    const sizeBonus = sizeMatch ? Number(sizeMatch[0]) / 100 : 0;
    candidates.push({ href, score: 3 + sizeBonus });
  });

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) candidates.push({ href: ogImage, score: 1 });

  if (candidates.length === 0) {
    candidates.push({ href: "/favicon.ico", score: 0 });
  }

  candidates.sort((a, b) => b.score - a.score);

  for (const candidate of candidates) {
    try {
      return new URL(candidate.href, baseUrl).toString();
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Fetch a single page's visible text content, stripped of boilerplate. Used by knowledge-base.ts. */
export async function scrapePageText(url: string): Promise<{ title: string; text: string }> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, svg, iframe").remove();

  const title = $("title").first().text().trim();
  const text = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  return { title, text };
}

/** Extract same-origin internal links from a page's <a> tags, for shallow crawling. */
export function extractInternalLinks($: ReturnType<typeof cheerio.load>, baseUrl: string): string[] {
  const origin = new URL(baseUrl).origin;
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const resolved = new URL(href, baseUrl);
      resolved.hash = "";
      if (resolved.origin === origin) {
        links.add(resolved.toString());
      }
    } catch {
      // ignore invalid hrefs
    }
  });

  return Array.from(links);
}

export async function fetchHtmlDocument(url: string) {
  const html = await fetchHtml(url);
  return cheerio.load(html);
}
