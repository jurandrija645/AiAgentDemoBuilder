"use client";

import { useState, useRef, useEffect } from "react";
import type { LeadData } from "@/lib/leads";
import { hexToRgba, readableTextColor } from "@/lib/color";
import { t } from "@/lib/i18n";
import { panelStyle, panelHeaderStyle } from "@/lib/surface";
import AgentAvatar from "./AgentAvatar";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget({ lead }: { lead: LeadData }) {
  const s = t(lead.locale);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: s.chatGreeting(lead.businessName) },
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "starting" | "sending">("idle");
  const listRef = useRef<HTMLDivElement>(null);
  const [primary = "#334155", accent = primary] = lead.branding.colors;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  async function handleSend() {
    const text = input.trim();
    if (!text || status !== "idle") return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");

    if (lead.mode === "mockup") {
      setStatus("starting");
      await new Promise((resolve) => setTimeout(resolve, 1100));
      setMessages((prev) => [...prev, { role: "assistant", content: s.chatMockupReply }]);
      setStatus("idle");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(`/leads/${lead.slug}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? s.chatError },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: s.chatUnreachable }]);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div
      className="flex h-[480px] w-full flex-col overflow-hidden rounded-2xl border backdrop-blur-xl"
      style={panelStyle(primary)}
    >
      <div className="flex items-center gap-2.5 border-b px-4 py-3" style={panelHeaderStyle()}>
        <AgentAvatar kind="chat" primary={primary} accent={accent} online />
        <span className="text-sm font-medium text-white/80">
          {s.chatTitle(lead.businessName)}
        </span>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <AgentAvatar kind="chat" primary={primary} accent={accent} size="sm" />
            )}
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
                      color: readableTextColor(primary),
                    }
                  : { background: hexToRgba("#ffffff", 0.06), color: "#e5e5ea" }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {status !== "idle" && (
          <div className="flex items-end justify-start gap-2">
            <AgentAvatar kind="chat" primary={primary} accent={accent} size="sm" pulse />
            <div
              className="rounded-2xl px-3.5 py-2 text-sm text-white/50"
              style={{ background: hexToRgba("#ffffff", 0.06) }}
            >
              {status === "starting" ? s.chatStarting : s.chatThinking}
            </div>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: hexToRgba("#ffffff", 0.08) }}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={s.chatPlaceholder}
          className="flex-1 rounded-full border bg-transparent px-4 py-2 text-sm text-white placeholder-white/40 outline-none"
          style={{ borderColor: hexToRgba("#ffffff", 0.15) }}
        />
        <button
          type="submit"
          disabled={status !== "idle" || !input.trim()}
          className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40"
          style={{
            backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
            color: readableTextColor(primary),
          }}
        >
          {s.chatSend}
        </button>
      </form>
    </div>
  );
}
