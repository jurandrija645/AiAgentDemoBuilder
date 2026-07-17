import { chromium } from "playwright";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export async function screenshotPage(url: string, outPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
}

/** Returns true if something is already listening at the given base URL. */
export async function isServerRunning(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(3_000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}
