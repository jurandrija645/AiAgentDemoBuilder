"use client";

import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import type { LeadData } from "@/lib/leads";
import { hexToRgba, readableTextColor } from "@/lib/color";
import { t } from "@/lib/i18n";

type CallState = "idle" | "connecting" | "active";

export default function VapiWidget({ lead }: { lead: LeadData }) {
  const s = t(lead.locale);
  const [primary = "#334155", accent = primary] = lead.branding.colors;
  const [callState, setCallState] = useState<CallState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  const isLive = lead.mode === "live" && Boolean(lead.vapiAssistantId);
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  async function handleClick() {
    if (!isLive) return;

    if (callState !== "idle") {
      await vapiRef.current?.stop();
      setCallState("idle");
      return;
    }

    if (!publicKey) {
      setErrorMessage(s.voiceMissingKey);
      return;
    }

    setErrorMessage(null);
    setCallState("connecting");

    try {
      if (!vapiRef.current) {
        const { default: VapiClient } = await import("@vapi-ai/web");
        const client = new VapiClient(publicKey);
        client.on("call-start", () => setCallState("active"));
        client.on("call-end", () => setCallState("idle"));
        client.on("error", (err) => {
          console.error("Vapi error", err);
          setErrorMessage(s.voiceCallProblem);
          setCallState("idle");
        });
        vapiRef.current = client;
      }
      await vapiRef.current.start(lead.vapiAssistantId);
    } catch (err) {
      console.error(err);
      setErrorMessage(s.voiceCallFailed);
      setCallState("idle");
    }
  }

  const statusText = !isLive
    ? s.voiceNotWired
    : errorMessage
      ? errorMessage
      : callState === "idle"
        ? s.voiceIdle
        : callState === "connecting"
          ? s.voiceConnecting
          : s.voiceActive;

  const buttonLabel = !isLive
    ? s.voiceButtonSoon
    : callState === "idle"
      ? s.voiceButtonStart
      : callState === "connecting"
        ? s.voiceConnecting
        : s.voiceButtonEnd;

  return (
    <div
      className="flex h-[480px] w-full flex-col overflow-hidden rounded-2xl border backdrop-blur-xl"
      style={{ borderColor: hexToRgba("#ffffff", 0.12), background: hexToRgba("#0b0d14", 0.7) }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: hexToRgba("#ffffff", 0.08) }}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: isLive ? "#34d399" : "#71717a" }}
        />
        <span className="text-sm font-medium text-white/80">
          {s.voiceTitle(lead.businessName)}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        <div className="relative flex h-32 w-32 items-center justify-center">
          {callState === "active" && (
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-40"
              style={{ backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})` }}
            />
          )}
          <span
            className="relative flex h-28 w-28 items-center justify-center rounded-full"
            style={{
              backgroundImage: isLive
                ? `linear-gradient(135deg, ${primary}, ${accent})`
                : `linear-gradient(135deg, ${hexToRgba("#ffffff", 0.15)}, ${hexToRgba("#ffffff", 0.08)})`,
              color: isLive ? readableTextColor(primary) : "#ffffff80",
              boxShadow: isLive ? `0 0 40px ${hexToRgba(primary, 0.35)}` : undefined,
            }}
          >
            <MicIcon active={callState === "active"} />
          </span>
        </div>

        <p className="max-w-xs text-center text-sm text-white/60">{statusText}</p>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={handleClick}
          disabled={!isLive || callState === "connecting"}
          className="w-full rounded-full px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          style={
            isLive
              ? {
                  backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
                  color: readableTextColor(primary),
                }
              : { background: hexToRgba("#ffffff", 0.1), color: "#ffffffb0" }
          }
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-10 w-10 ${active ? "animate-pulse" : ""}`}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
