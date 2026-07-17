"use client";

import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";
import type { LeadData } from "@/lib/leads";
import { hexToRgba, readableTextColor } from "@/lib/color";

type CallState = "idle" | "connecting" | "active";

export default function VapiWidget({ lead }: { lead: LeadData }) {
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
      setErrorMessage("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY in .env.local");
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
          setErrorMessage("The call ran into a problem. Try again.");
          setCallState("idle");
        });
        vapiRef.current = client;
      }
      await vapiRef.current.start(lead.vapiAssistantId);
    } catch (err) {
      console.error(err);
      setErrorMessage("Couldn't start the call.");
      setCallState("idle");
    }
  }

  const label = !isLive
    ? "Voice demo coming soon"
    : callState === "idle"
      ? "Talk to it"
      : callState === "connecting"
        ? "Connecting…"
        : "End call";

  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 backdrop-blur-xl"
      style={{ borderColor: hexToRgba("#ffffff", 0.12), background: hexToRgba("#0b0d14", 0.7) }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundImage: isLive
              ? `linear-gradient(135deg, ${primary}, ${accent})`
              : `linear-gradient(135deg, ${hexToRgba("#ffffff", 0.15)}, ${hexToRgba("#ffffff", 0.08)})`,
            color: isLive ? readableTextColor(primary) : "#ffffff80",
          }}
        >
          <MicIcon active={callState === "active"} />
        </span>
        <div>
          <p className="text-sm font-medium text-white/85">Voice assistant</p>
          {errorMessage ? (
            <p className="text-xs text-red-400">{errorMessage}</p>
          ) : (
            <p className="text-xs text-white/50">
              {isLive ? "Real-time voice, powered by Vapi" : "Wired up after your call is booked"}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleClick}
        disabled={!isLive || callState === "connecting"}
        className="rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-40"
        style={
          isLive
            ? {
                backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
                color: readableTextColor(primary),
              }
            : { background: hexToRgba("#ffffff", 0.1), color: "#ffffffb0" }
        }
      >
        {label}
      </button>
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
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 ${active ? "animate-pulse" : ""}`}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
