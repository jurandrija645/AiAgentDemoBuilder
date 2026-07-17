import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; LeadDemoGeneratorBot/1.0; +https://localhost)";

export class ScrapeBlockedError extends Error {}

export interface ScrapedSite {
  businessName: string | null;
  logoUrl: string | null;
  metaDescription: string | null;
}

export async function scrapeSite(url: string): Promise<ScrapedSite> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const businessName =
    $('meta[property="og:site_name"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    null;

  const metaDescription =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    null;

  const logoUrl = resolveLogoUrl($, url);

  return { businessName, logoUrl, metaDescription };
}

async function fetchHtml(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
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
