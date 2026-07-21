"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import type { LeadData } from "@/lib/leads";
import { readableTextColor } from "@/lib/color";
import { t } from "@/lib/i18n";
import { panelStyle, panelHeaderStyle } from "@/lib/surface";
import { tokens, onTheme, type Theme } from "@/lib/theme";
import AgentAvatar from "./AgentAvatar";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget({ lead, theme }: { lead: LeadData; theme?: Theme }) {
  const s = t(lead.locale);
  const tk = tokens(theme);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: s.chatGreeting(lead.businessName) },
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "starting" | "sending">("idle");
  const listRef = useRef<HTMLDivElement>(null);
  const [rawPrimary = "#334155", rawAccent = rawPrimary] = lead.branding.colors;
  const primary = onTheme(rawPrimary, theme);
  const accent = onTheme(rawAccent, theme);

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
      style={panelStyle(primary, theme)}
    >
      <div className="flex items-center gap-2.5 border-b px-4 py-3" style={panelHeaderStyle(theme)}>
        <AgentAvatar kind="chat" primary={primary} accent={accent} online theme={theme} />
        <span className="text-sm font-medium" style={{ color: tk.textPrimary }}>
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
              <AgentAvatar kind="chat" primary={primary} accent={accent} size="sm" theme={theme} />
            )}
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
                      color: readableTextColor(primary),
                    }
                  : { background: tk.bubbleBg, color: tk.bubbleText }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {status !== "idle" && (
          <div className="flex items-end justify-start gap-2">
            <AgentAvatar kind="chat" primary={primary} accent={accent} size="sm" pulse theme={theme} />
            <div
              className="rounded-2xl px-3.5 py-2 text-sm"
              style={{ background: tk.bubbleBg, color: tk.textFaint }}
            >
              {status === "starting" ? s.chatStarting : s.chatThinking}
            </div>
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: tk.divider }}
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={s.chatPlaceholder}
          className="chat-input flex-1 rounded-full border bg-transparent px-4 py-2 text-sm outline-none"
          style={
            {
              borderColor: tk.inputBorder,
              color: tk.inputText,
              "--placeholder": tk.placeholder,
            } as CSSProperties
          }
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
