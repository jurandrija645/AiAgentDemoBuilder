import { config } from "dotenv";
import * as path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { parseArgs } from "node:util";

import { scrapeSite, ScrapeBlockedError } from "../lib/scrape";
import { extractPalette } from "../lib/palette";
import { screenshotPage, isServerRunning } from "../lib/screenshot";
import { slugify } from "../lib/slugify";
import { writeLead, screenshotPath, type LeadData } from "../lib/leads";
import { ask } from "../lib/prompt";
import { DEFAULT_LOCALE, isLocale } from "../lib/i18n";

const DEV_SERVER = "http://localhost:3000";

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: "string" },
      name: { type: "string" },
      locale: { type: "string" },
    },
  });

  if (!values.url) {
    console.error(
      "Usage: npm run generate-hero -- --url=https://example.com [--name=\"Business Name\"] [--locale=en|de]",
    );
    process.exit(1);
  }

  const locale = values.locale ?? DEFAULT_LOCALE;
  if (!isLocale(locale)) {
    console.error(`Unsupported locale "${locale}". Supported: en, de`);
    process.exit(1);
  }

  const sourceUrl = values.url;

  console.log(`Scraping ${sourceUrl}...`);
  let businessName = values.name ?? null;
  let logoUrl: string | null = null;
  let metaDescription: string | null = null;

  try {
    const scraped = await scrapeSite(sourceUrl);
    businessName = businessName ?? scraped.businessName;
    logoUrl = scraped.logoUrl;
    metaDescription = scraped.metaDescription;
  } catch (err) {
    if (err instanceof ScrapeBlockedError) {
      console.warn(`Scraping was blocked: ${err.message}`);
      console.warn("Falling back to manual input.");
      businessName = businessName ?? (await ask("Business name"));
      logoUrl = (await ask("Logo URL (leave blank to use a generated badge)")) || null;
    } else {
      throw err;
    }
  }

  if (!businessName) {
    businessName = await ask("Couldn't determine a business name — enter one");
  }

  const slug = slugify(businessName);
  if (!slug) {
    console.error("Could not derive a URL-safe slug from the business name. Try passing --name explicitly.");
    process.exit(1);
  }

  console.log("Extracting colors...");
  const palette = await extractPalette(logoUrl, businessName);

  const now = new Date().toISOString();
  const lead: LeadData = {
    slug,
    businessName,
    sourceUrl,
    mode: "mockup",
    locale,
    branding: {
      logoUrl,
      logoIsFallback: palette.logoIsFallback,
      colors: palette.colors,
      metaDescription,
    },
    createdAt: now,
    updatedAt: now,
  };

  await writeLead(lead);
  console.log(`Saved leads/${slug}/lead.json`);

  const leadUrl = `${DEV_SERVER}/leads/${slug}`;
  console.log("Checking that the dev server is running...");
  if (!(await isServerRunning(DEV_SERVER))) {
    console.error(
      `No dev server found at ${DEV_SERVER}. Start it in another terminal with "npm run dev", then re-run this script.`,
    );
    process.exit(1);
  }

  console.log(`Rendering ${leadUrl}...`);
  console.log("Screenshotting...");
  const outPath = screenshotPath(slug, "hero");
  await screenshotPage(leadUrl, outPath);

  console.log("");
  console.log(`Done: slug=${slug}`);
  console.log(`Screenshot: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
