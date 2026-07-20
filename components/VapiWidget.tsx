"use client";

import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import type { LeadData } from "@/lib/leads";
import { readableTextColor } from "@/lib/color";
import { t } from "@/lib/i18n";
import { panelStyle, panelHeaderStyle } from "@/lib/surface";
import AgentAvatar from "./AgentAvatar";

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

  // The mockup is a sales asset: it should read as a finished product, so it
  // shows the same copy and styling as a live agent. Only the behaviour differs
  // — the button is inert until Process B wires up a real assistant.
  const statusText = errorMessage
    ? errorMessage
    : callState === "idle"
      ? s.voiceIdle
      : callState === "connecting"
        ? s.voiceConnecting
        : s.voiceActive;

  const buttonLabel =
    callState === "idle"
      ? s.voiceButtonStart
      : callState === "connecting"
        ? s.voiceConnecting
        : s.voiceButtonEnd;

  return (
    <div
      className="flex h-[480px] w-full flex-col overflow-hidden rounded-2xl border backdrop-blur-xl"
      style={panelStyle(primary)}
    >
      <div className="flex items-center gap-2.5 border-b px-4 py-3" style={panelHeaderStyle()}>
        <AgentAvatar kind="voice" primary={primary} accent={accent} online />
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
          <AgentAvatar
            kind="voice"
            primary={primary}
            accent={accent}
            size="lg"
            online
            pulse={callState === "active"}
          />
        </div>

        <p className="max-w-xs text-center text-sm text-white/70">{statusText}</p>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={handleClick}
          disabled={!isLive || callState === "connecting"}
          className={`w-full rounded-full px-4 py-3 text-sm font-medium ${
            callState === "connecting" ? "opacity-60" : ""
          }`}
          style={{
            backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
            color: readableTextColor(primary),
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

