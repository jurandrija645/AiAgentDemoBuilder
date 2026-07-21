import { hexToRgba, readableTextColor } from "@/lib/color";
import { tokens, type Theme } from "@/lib/theme";

const SIZES = {
  sm: { box: "h-7 w-7", glyph: "h-3.5 w-3.5", dot: "h-2 w-2" },
  md: { box: "h-9 w-9", glyph: "h-4.5 w-4.5", dot: "h-2.5 w-2.5" },
  lg: { box: "h-28 w-28", glyph: "h-12 w-12", dot: "h-4 w-4" },
} as const;

/**
 * Stands in for the agent itself. Deliberately an illustrated mark rather than
 * a photo — these are AI agents, and a headshot would read as a human employee.
 * Chat and voice get different glyphs so they read as two distinct agents.
 */
export default function AgentAvatar({
  kind,
  primary,
  accent,
  size = "md",
  online = false,
  pulse = false,
  theme,
}: {
  kind: "chat" | "voice";
  primary: string;
  accent: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  pulse?: boolean;
  theme?: Theme;
}) {
  const s = SIZES[size];
  const tk = tokens(theme);

  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`flex ${s.box} items-center justify-center rounded-full`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
          color: readableTextColor(primary),
          boxShadow: `inset 0 1px 0 ${hexToRgba("#ffffff", 0.25)}, 0 0 24px -8px ${hexToRgba(primary, 0.8)}`,
        }}
      >
        {kind === "chat" ? (
          <ChatGlyph className={`${s.glyph} ${pulse ? "animate-pulse" : ""}`} holeColor={primary} />
        ) : (
          <VoiceGlyph className={`${s.glyph} ${pulse ? "animate-pulse" : ""}`} />
        )}
      </span>
      {online && (
        <span
          className={`absolute -right-0.5 -bottom-0.5 ${s.dot} rounded-full border-2`}
          style={{ background: "#34d399", borderColor: tk.panelSolid }}
        />
      )}
    </span>
  );
}

/** Speech bubble with typing dots — the chat agent. */
function ChatGlyph({ className, holeColor }: { className: string; holeColor: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.6 3.4a.6.6 0 0 1-1-.5V16H6.5A2.5 2.5 0 0 1 4 13.5z"
        fill="currentColor"
        opacity={0.95}
      />
      {/* The dots read as holes in the bubble, so they take the circle's own color. */}
      <g fill={holeColor}>
        <circle cx="8.5" cy="10" r="1.15" />
        <circle cx="12" cy="10" r="1.15" />
        <circle cx="15.5" cy="10" r="1.15" />
      </g>
    </svg>
  );
}

/** Headset — the voice agent. */
function VoiceGlyph({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h2.2a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 1 4 17z" fill="currentColor" />
      <path d="M20 13h-2.2a1 1 0 0 0-1 1v3.5a1 1 0 0 0 1 1h.7a1.5 1.5 0 0 0 1.5-1.5z" fill="currentColor" />
      <path d="M20 18.5v.5a2.5 2.5 0 0 1-2.5 2.5H13" />
    </svg>
  );
}
