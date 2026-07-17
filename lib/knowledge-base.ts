import { fetchHtmlDocument, extractInternalLinks, scrapePageText } from "./scrape";

const MAX_PAGES = 5; // homepage + up to 4 more
const MAX_TOTAL_CHARS = 15_000;
const RELEVANT_PATH_KEYWORDS = ["about", "service", "contact", "location", "pricing", "hours"];

/**
 * Crawls the homepage plus a handful of relevant internal pages (about,
 * services, contact, ...), strips boilerplate, and concatenates the
 * substantive text into a single blob suitable for context-stuffing a
 * grounded chat agent.
 */
export async function buildKnowledgeBase(sourceUrl: string): Promise<string> {
  const pageUrls = await discoverPages(sourceUrl);

  const sections: string[] = [];
  let totalChars = 0;

  for (const url of pageUrls) {
    if (totalChars >= MAX_TOTAL_CHARS) break;
    try {
      const { title, text } = await scrapePageText(url);
      if (!text) continue;
      const section = `## ${title || url}\n${text}`;
      sections.push(section);
      totalChars += section.length;
    } catch {
      // skip pages that fail to load — best effort crawl
    }
  }

  return sections.join("\n\n").slice(0, MAX_TOTAL_CHARS);
}

async function discoverPages(sourceUrl: string): Promise<string[]> {
  const urls = [sourceUrl];

  try {
    const $ = await fetchHtmlDocument(sourceUrl);
    const links = extractInternalLinks($, sourceUrl);

    const relevant = links.filter((link) => {
      const path = new URL(link).pathname.toLowerCase();
      return RELEVANT_PATH_KEYWORDS.some((keyword) => path.includes(keyword));
    });

    for (const link of relevant) {
      if (urls.length >= MAX_PAGES) break;
      if (!urls.includes(link)) urls.push(link);
    }
  } catch {
    // homepage-only knowledge base if link discovery fails
  }

  return urls;
}
