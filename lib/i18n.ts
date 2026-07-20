export type Locale = "en" | "de";

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "de";
}

interface Strings {
  badge: string;
  liveOn: (host: string) => string;
  headline: (name: string) => { before: string; after: string };
  heroFallback: string;
  chatTitle: (name: string) => string;
  chatGreeting: (name: string) => string;
  chatPlaceholder: string;
  chatSend: string;
  chatStarting: string;
  chatThinking: string;
  chatMockupReply: string;
  chatError: string;
  chatUnreachable: string;
  voiceTitle: (name: string) => string;
  voiceIdle: string;
  voiceConnecting: string;
  voiceActive: string;
  voiceCallProblem: string;
  voiceCallFailed: string;
  voiceMissingKey: string;
  voiceButtonStart: string;
  voiceButtonEnd: string;
  footerTagline: (name: string) => string;
  footerLive: string;
  footerPreview: string;
}

const STRINGS: Record<Locale, Strings> = {
  en: {
    badge: "AI Concierge",
    liveOn: (host) => `Live on ${host}`,
    headline: () => ({ before: "Talk to ", after: ", instantly." }),
    heroFallback:
      "Ask about hours, services, pricing, or booking — day or night. No hold music, no phone tag.",
    chatTitle: (name) => `Chat with ${name}`,
    chatGreeting: (name) => `Hey! Thanks for stopping by ${name} — what can I help you with?`,
    chatPlaceholder: "Ask a question…",
    chatSend: "Send",
    chatStarting: "Starting up…",
    chatThinking: "Thinking…",
    chatMockupReply:
      "Thanks for the message! This is a preview of what your AI assistant will look like — the full agent isn't wired up yet.",
    chatError: "Sorry, something went wrong.",
    chatUnreachable: "Sorry, I couldn't reach the assistant just now.",
    voiceTitle: (name) => `Talk to ${name}`,
    voiceIdle: "Real-time voice, powered by Mindaptive",
    voiceConnecting: "Connecting…",
    voiceActive: "Listening — speak whenever you're ready",
    voiceCallProblem: "The call ran into a problem. Try again.",
    voiceCallFailed: "Couldn't start the call.",
    voiceMissingKey: "Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY in .env.local",
    voiceButtonStart: "Talk to it",
    voiceButtonEnd: "End call",
    footerTagline: (name) => `${name} — AI assistant, always on.`,
    footerLive: "Live agent",
    footerPreview: "Always on",
  },
  de: {
    badge: "KI-Concierge",
    liveOn: (host) => `Live auf ${host}`,
    headline: () => ({ before: "Sprechen Sie mit ", after: " — sofort." }),
    heroFallback:
      "Fragen Sie nach Öffnungszeiten, Leistungen, Preisen oder Terminen — Tag und Nacht. Keine Warteschleife, kein Rückrufchaos.",
    chatTitle: (name) => `Chat mit ${name}`,
    chatGreeting: (name) => `Hallo! Schön, dass Sie bei ${name} vorbeischauen — wie kann ich helfen?`,
    chatPlaceholder: "Stellen Sie eine Frage…",
    chatSend: "Senden",
    chatStarting: "Wird gestartet…",
    chatThinking: "Denkt nach…",
    chatMockupReply:
      "Danke für Ihre Nachricht! Dies ist eine Vorschau Ihres KI-Assistenten — der vollständige Agent ist noch nicht angebunden.",
    chatError: "Entschuldigung, da ist etwas schiefgelaufen.",
    chatUnreachable: "Entschuldigung, der Assistent ist gerade nicht erreichbar.",
    voiceTitle: (name) => `Sprechen mit ${name}`,
    voiceIdle: "Echtzeit-Sprachassistent, powered by Mindaptive",
    voiceConnecting: "Verbindung wird aufgebaut…",
    voiceActive: "Ich höre zu — sprechen Sie einfach los",
    voiceCallProblem: "Beim Anruf ist ein Problem aufgetreten. Bitte erneut versuchen.",
    voiceCallFailed: "Der Anruf konnte nicht gestartet werden.",
    voiceMissingKey: "NEXT_PUBLIC_VAPI_PUBLIC_KEY fehlt in .env.local",
    voiceButtonStart: "Jetzt sprechen",
    voiceButtonEnd: "Anruf beenden",
    footerTagline: (name) => `${name} — KI-Assistent, rund um die Uhr.`,
    footerLive: "Live-Agent",
    footerPreview: "Immer erreichbar",
  },
};

export function t(locale: Locale | undefined): Strings {
  return STRINGS[locale ?? DEFAULT_LOCALE] ?? STRINGS[DEFAULT_LOCALE];
}
