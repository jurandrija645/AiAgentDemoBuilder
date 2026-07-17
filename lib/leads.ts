import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface LeadData {
  slug: string;
  businessName: string;
  sourceUrl: string;
  mode: "mockup" | "live";
  branding: {
    logoUrl: string | null;
    logoIsFallback: boolean;
    colors: string[];
    metaDescription: string | null;
  };
  knowledgeBase?: string;
  vapiAssistantId?: string;
  createdAt: string;
  updatedAt: string;
}

const LEADS_DIR = path.join(process.cwd(), "data", "leads");

function leadPath(slug: string): string {
  return path.join(LEADS_DIR, `${slug}.json`);
}

export async function readLead(slug: string): Promise<LeadData | null> {
  try {
    const raw = await fs.readFile(leadPath(slug), "utf-8");
    return JSON.parse(raw) as LeadData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeLead(lead: LeadData): Promise<void> {
  await fs.mkdir(LEADS_DIR, { recursive: true });
  await fs.writeFile(leadPath(lead.slug), JSON.stringify(lead, null, 2), "utf-8");
}
