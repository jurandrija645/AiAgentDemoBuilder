import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readLead } from "@/lib/leads";

const anthropic = new Anthropic();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const lead = await readLead(slug);

  if (!lead) {
    return NextResponse.json({ reply: "This demo could not be found." }, { status: 404 });
  }

  if (lead.mode !== "live" || !lead.knowledgeBase) {
    return NextResponse.json({
      reply: "This assistant isn't fully wired up yet — check back after the demo call.",
    });
  }

  const body = await request.json().catch(() => null);
  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  // Claude requires the conversation to start with a user turn; drop any
  // leading assistant greeting the client keeps around for display only.
  const firstUserIndex = messages.findIndex((m) => m.role === "user");
  const conversation = firstUserIndex === -1 ? [] : messages.slice(firstUserIndex);

  if (conversation.length === 0) {
    return NextResponse.json({ reply: `Ask me anything about ${lead.businessName}!` });
  }

  const systemPrompt = `You are the AI assistant for ${lead.businessName}. Answer questions using only the following information about the business: ${lead.knowledgeBase}. Keep answers short and helpful.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: systemPrompt,
      messages: conversation.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const reply =
      textBlock && textBlock.type === "text"
        ? textBlock.text
        : "Sorry, I couldn't come up with an answer to that.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { reply: "Sorry, something went wrong answering that. Please try again." },
      { status: 500 },
    );
  }
}
