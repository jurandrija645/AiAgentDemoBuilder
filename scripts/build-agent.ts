import { config } from "dotenv";
import * as path from "node:path";
config({ path: path.resolve(process.cwd(), ".env.local") });

import { parseArgs } from "node:util";

import { readLead, writeLead } from "../lib/leads";
import { buildKnowledgeBase } from "../lib/knowledge-base";
import { buildVoiceSystemPrompt } from "../lib/systemPrompt";

// Vapi's accepted Claude model string can change as they add new models.
// Override via VAPI_ANTHROPIC_MODEL in .env.local if this default is rejected
// (the script prints Vapi's error body, which names the valid values).
const VAPI_ANTHROPIC_MODEL = process.env.VAPI_ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const VAPI_VOICE_PROVIDER = process.env.VAPI_VOICE_PROVIDER ?? "11labs";
const VAPI_VOICE_ID = process.env.VAPI_VOICE_ID ?? "paula";
const VAPI_TRANSCRIBER_LANGUAGE = process.env.VAPI_TRANSCRIBER_LANGUAGE ?? "en";

async function main() {
  const { values } = parseArgs({
    options: {
      slug: { type: "string" },
    },
  });

  if (!values.slug) {
    console.error('Usage: npm run build-agent -- --slug="green-sunny-dental"');
    process.exit(1);
  }

  const vapiApiKey = process.env.VAPI_API_KEY;
  if (!vapiApiKey) {
    console.error("Missing VAPI_API_KEY in .env.local");
    process.exit(1);
  }

  const slug = values.slug;
  const lead = await readLead(slug);
  if (!lead) {
    console.error(`No lead found for slug "${slug}". Run "npm run generate-hero" for it first.`);
    process.exit(1);
  }

  console.log(`Crawling ${lead.sourceUrl} for a knowledge base...`);
  const knowledgeBase = await buildKnowledgeBase(lead.sourceUrl);
  console.log(`Collected ${knowledgeBase.length} characters of site content.`);
  if (knowledgeBase.length < 200) {
    console.warn(
      "That's very little content — the site may render its content with JavaScript, " +
        "which this crawler can't execute. The agent's answers may be weak. " +
        `Consider passing a more crawlable page, or editing leads/${slug}/knowledge-base.md by hand.`,
    );
  }

  const systemPrompt = buildVoiceSystemPrompt(lead.businessName, knowledgeBase);

  console.log("Creating Vapi assistant...");
  const vapiAssistantId = await createVapiAssistant({
    apiKey: vapiApiKey,
    businessName: lead.businessName,
    systemPrompt,
  });
  console.log(`Vapi assistant created: ${vapiAssistantId}`);

  const now = new Date().toISOString();
  await writeLead({
    ...lead,
    knowledgeBase,
    vapiAssistantId,
    mode: "live",
    updatedAt: now,
  });

  console.log("");
  console.log(`Done: ${lead.businessName} is now live at http://localhost:3000/leads/${slug}`);
  console.log("The chat widget is now grounded in the site content, and the voice button will start a real Vapi call.");
}

async function createVapiAssistant(opts: {
  apiKey: string;
  businessName: string;
  systemPrompt: string;
}): Promise<string> {
  const res = await fetch("https://api.vapi.ai/assistant", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: opts.businessName,
      firstMessage: `Hey, thanks for calling ${opts.businessName}! What can I help you with?`,
      model: {
        provider: "anthropic",
        model: VAPI_ANTHROPIC_MODEL,
        messages: [{ role: "system", content: opts.systemPrompt }],
      },
      voice: {
        provider: VAPI_VOICE_PROVIDER,
        voiceId: VAPI_VOICE_ID,
      },
      transcriber: {
        provider: "deepgram",
        language: VAPI_TRANSCRIBER_LANGUAGE,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Vapi assistant creation failed (HTTP ${res.status}): ${body}\n` +
        `If this names an invalid model, set VAPI_ANTHROPIC_MODEL in .env.local to a value it accepts.`,
    );
  }

  const data = await res.json();
  if (!data?.id) {
    throw new Error(`Vapi response did not include an assistant id: ${JSON.stringify(data)}`);
  }
  return data.id as string;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
