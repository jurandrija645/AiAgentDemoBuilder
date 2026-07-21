import { config } from "dotenv";
import * as path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { parseArgs } from "node:util";

import { scrapeSite, ScrapeBlockedError } from "../lib/scrape";
import { extractPalette } from "../lib/palette";
import { fetchLogoDataUri } from "../lib/logo";
import { screenshotPage, isServerRunning } from "../lib/screenshot";
import { slugify } from "../lib/slugify";
import { normalizeBusinessName } from "../lib/business-name";
import { writeLead, screenshotPath, type LeadData } from "../lib/leads";
import { ask } from "../lib/prompt";
import { DEFAULT_LOCALE, isLocale, localeFromLang, SUPPORTED_LOCALES, type Locale } from "../lib/i18n";
import { DEFAULT_THEME, isTheme, type Theme } from "../lib/theme";

const DEV_SERVER = "http://localhost:3000";

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: "string" },
      name: { type: "string" },
      locale: { type: "string" },
      theme: { type: "string" },
    },
  });

  if (!values.url) {
    console.error(
      `Usage: npm run generate-hero -- --url=https://example.com [--name="Business Name"] [--locale=${SUPPORTED_LOCALES.join("|")}]`,
    );
    process.exit(1);
  }

  // An explicit --locale always wins; otherwise we take the site's own language
  // (detected below) so the page goes out in the language the lead reads.
  let explicitLocale: Locale | undefined;
  if (values.locale !== undefined) {
    if (!isLocale(values.locale)) {
      console.error(`Unsupported locale "${values.locale}". Supported: ${SUPPORTED_LOCALES.join(", ")}`);
      process.exit(1);
    }
    explicitLocale = values.locale;
  }

  let explicitTheme: Theme | undefined;
  if (values.theme !== undefined) {
    if (!isTheme(values.theme)) {
      console.error(`Unsupported theme "${values.theme}". Supported: dark, light`);
      process.exit(1);
    }
    explicitTheme = values.theme;
  }

  const sourceUrl = values.url;

  console.log(`Scraping ${sourceUrl}...`);
  let businessName = values.name ?? null;
  let logoUrl: string | null = null;
  let metaDescription: string | null = null;
  let detectedLocale: Locale | null = null;
  let siteColors: string[] = [];
  let detectedTheme: Theme | null = null;

  try {
    const scraped = await scrapeSite(sourceUrl);
    detectedTheme = scraped.theme;
    businessName = businessName ?? scraped.businessName;
    logoUrl = scraped.logoUrl;
    metaDescription = scraped.metaDescription;
    siteColors = scraped.siteColors;
    detectedLocale = localeFromLang(scraped.lang);
    if (scraped.lang && !detectedLocale) {
      console.warn(
        `Site language "${scraped.lang}" isn't supported yet — falling back to ${DEFAULT_LOCALE}. ` +
          `Add it to lib/i18n.ts, or pass --locale explicitly.`,
      );
    }
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

  const locale: Locale = explicitLocale ?? detectedLocale ?? DEFAULT_LOCALE;
  console.log(
    `Page language: ${locale}` +
      (explicitLocale ? " (from --locale)" : detectedLocale ? " (detected from site)" : " (default)"),
  );

  const theme: Theme = explicitTheme ?? detectedTheme ?? DEFAULT_THEME;
  console.log(
    `Page theme: ${theme}` +
      (explicitTheme ? " (from --theme)" : detectedTheme ? " (matched to their site)" : " (default)"),
  );

  if (!businessName) {
    businessName = await ask("Couldn't determine a business name — enter one");
  }

  const rawName = businessName;
  businessName = normalizeBusinessName(businessName);
  if (businessName !== rawName) {
    console.log(`Business name: "${businessName}" (dropped legal suffix from "${rawName}")`);
  }

  const slug = slugify(businessName);
  if (!slug) {
    console.error("Could not derive a URL-safe slug from the business name. Try passing --name explicitly.");
    process.exit(1);
  }

  console.log("Extracting colors...");
  const palette = await extractPalette(logoUrl, businessName, siteColors);
  console.log(
    `Colors: ${palette.colors.join(" ")} (${siteColors.length ? `site CSS${palette.colors.length > siteColors.length ? " + logo" : ""}` : "logo"})`,
  );

  // Inline the logo so the page never has to fetch it from the lead's server
  // (hotlink protection breaks a plain <img src> in the browser).
  const logoDataUri = palette.logoIsFallback ? null : await fetchLogoDataUri(logoUrl);
  if (logoUrl && !palette.logoIsFallback && !logoDataUri) {
    console.warn("Couldn't inline the logo — the page will link to it remotely, which may not render.");
  }

  const now = new Date().toISOString();
  const lead: LeadData = {
    slug,
    businessName,
    sourceUrl,
    mode: "mockup",
    locale,
    theme,
    branding: {
      logoUrl,
      logoDataUri,
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

  // Both variants get shot so you can pick from the screenshots, but the lead's
  // own theme is what the live page serves by default.
  console.log(`Rendering ${leadUrl} (both themes)...`);
  const shots: { theme: Theme; path: string }[] = [];
  for (const variant of ["light", "dark"] as const) {
    const outPath = screenshotPath(slug, `hero-${variant}`);
    await screenshotPage(`${leadUrl}?theme=${variant}`, outPath);
    shots.push({ theme: variant, path: outPath });
  }

  console.log("");
  console.log(`Done: slug=${slug}`);
  for (const shot of shots) {
    console.log(`Screenshot (${shot.theme}${shot.theme === theme ? ", matches their site" : ""}): ${shot.path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
