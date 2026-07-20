import * as fs from "node:fs/promises";
import * as path from "node:path";

import type { Locale } from "./i18n";

/**
 * Everything for one lead lives in `leads/<slug>/`:
 *
 *   leads/sonnenpuls/
 *     lead.json           branding + mode (this is what the page renders from)
 *     knowledge-base.md   Process B, optional — plain text so it's hand-editable
 *     agent.json          Process B, optional — Vapi assistant id
 *     screenshots/
 *       hero.png          Process A
 *       live.png          Process B
 *
 * `LeadData` is the assembled view of those files. Callers never touch the
 * split — `readLead` merges, `writeLead` splits back out.
 */
export interface LeadData {
  slug: string;
  businessName: string;
  sourceUrl: string;
  mode: "mockup" | "live";
  locale?: Locale;
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

/** The subset persisted to lead.json — knowledge base and agent live in their own files. */
type LeadCore = Omit<LeadData, "knowledgeBase" | "vapiAssistantId">;

interface AgentFile {
  vapiAssistantId: string;
}

const LEADS_DIR = path.join(process.cwd(), "leads");

export function leadDir(slug: string): string {
  return path.join(LEADS_DIR, slug);
}

export function leadFilePath(slug: string): string {
  return path.join(leadDir(slug), "lead.json");
}

export function knowledgeBasePath(slug: string): string {
  return path.join(leadDir(slug), "knowledge-base.md");
}

export function agentFilePath(slug: string): string {
  return path.join(leadDir(slug), "agent.json");
}

/** `name` is the screenshot's role: "hero" (Process A) or "live" (Process B). */
export function screenshotPath(slug: string, name: "hero" | "live"): string {
  return path.join(leadDir(slug), "screenshots", `${name}.png`);
}

async function readIfPresent(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function readLead(slug: string): Promise<LeadData | null> {
  const raw = await readIfPresent(leadFilePath(slug));
  if (raw === null) return null;

  const core = JSON.parse(raw) as LeadCore;
  const [knowledgeBase, agentRaw] = await Promise.all([
    readIfPresent(knowledgeBasePath(slug)),
    readIfPresent(agentFilePath(slug)),
  ]);

  const lead: LeadData = { ...core };
  if (knowledgeBase !== null) lead.knowledgeBase = knowledgeBase;
  if (agentRaw !== null) lead.vapiAssistantId = (JSON.parse(agentRaw) as AgentFile).vapiAssistantId;
  return lead;
}

export async function writeLead(lead: LeadData): Promise<void> {
  const { knowledgeBase, vapiAssistantId, ...core } = lead;

  await fs.mkdir(leadDir(lead.slug), { recursive: true });
  await fs.writeFile(leadFilePath(lead.slug), `${JSON.stringify(core, null, 2)}\n`, "utf-8");

  if (knowledgeBase !== undefined) {
    await fs.writeFile(knowledgeBasePath(lead.slug), knowledgeBase, "utf-8");
  }
  if (vapiAssistantId !== undefined) {
    const agent: AgentFile = { vapiAssistantId };
    await fs.writeFile(agentFilePath(lead.slug), `${JSON.stringify(agent, null, 2)}\n`, "utf-8");
  }
}

/** Slugs that have a lead.json, sorted. */
export async function listLeadSlugs(): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(LEADS_DIR, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const slugs = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (e) => ((await readIfPresent(leadFilePath(e.name))) !== null ? e.name : null)),
  );
  return slugs.filter((s): s is string => s !== null).sort();
}
