export type Locale = "en" | "de" | "es" | "nl" | "da";

export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES: Locale[] = ["en", "de", "es", "nl", "da"];

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(value);
}

/**
 * Map a website's `lang` attribute (e.g. "es", "es-ES", "nl-NL") to a locale we
 * render, or null if we don't have strings for it yet. Landing pages go out in
 * the lead's own language; the base subtag is all we key on.
 */
export function localeFromLang(lang: string | null | undefined): Locale | null {
  if (!lang) return null;
  const base = lang.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : null;
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
  es: {
    badge: "Conserje IA",
    liveOn: (host) => `En directo en ${host}`,
    headline: () => ({ before: "Habla con ", after: ", al instante." }),
    heroFallback:
      "Pregunta por horarios, servicios, precios o citas — de día o de noche. Sin música de espera, sin llamadas perdidas.",
    chatTitle: (name) => `Chat con ${name}`,
    chatGreeting: (name) => `¡Hola! Gracias por visitar ${name} — ¿en qué puedo ayudarte?`,
    chatPlaceholder: "Haz una pregunta…",
    chatSend: "Enviar",
    chatStarting: "Iniciando…",
    chatThinking: "Pensando…",
    chatMockupReply:
      "¡Gracias por tu mensaje! Esto es una vista previa de tu asistente de IA — el agente completo aún no está conectado.",
    chatError: "Lo siento, algo ha salido mal.",
    chatUnreachable: "Lo siento, no he podido contactar con el asistente ahora mismo.",
    voiceTitle: (name) => `Habla con ${name}`,
    voiceIdle: "Voz en tiempo real, con la tecnología de Mindaptive",
    voiceConnecting: "Conectando…",
    voiceActive: "Te escucho — habla cuando quieras",
    voiceCallProblem: "Ha habido un problema con la llamada. Inténtalo de nuevo.",
    voiceCallFailed: "No se ha podido iniciar la llamada.",
    voiceMissingKey: "Falta NEXT_PUBLIC_VAPI_PUBLIC_KEY en .env.local",
    voiceButtonStart: "Habla con él",
    voiceButtonEnd: "Colgar",
    footerTagline: (name) => `${name} — asistente de IA, siempre disponible.`,
    footerLive: "Agente en directo",
    footerPreview: "Siempre disponible",
  },
  nl: {
    badge: "AI-conciërge",
    liveOn: (host) => `Live op ${host}`,
    headline: () => ({ before: "Praat met ", after: ", direct." }),
    heroFallback:
      "Vraag naar openingstijden, diensten, prijzen of afspraken — dag en nacht. Geen wachtmuziek, geen telefoontag.",
    chatTitle: (name) => `Chat met ${name}`,
    chatGreeting: (name) => `Hoi! Fijn dat je bij ${name} langskomt — waarmee kan ik je helpen?`,
    chatPlaceholder: "Stel een vraag…",
    chatSend: "Versturen",
    chatStarting: "Opstarten…",
    chatThinking: "Aan het denken…",
    chatMockupReply:
      "Bedankt voor je bericht! Dit is een voorbeeld van je AI-assistent — de volledige agent is nog niet aangesloten.",
    chatError: "Sorry, er ging iets mis.",
    chatUnreachable: "Sorry, ik kon de assistent nu even niet bereiken.",
    voiceTitle: (name) => `Praat met ${name}`,
    voiceIdle: "Realtime spraak, mogelijk gemaakt door Mindaptive",
    voiceConnecting: "Verbinden…",
    voiceActive: "Ik luister — spreek wanneer je klaar bent",
    voiceCallProblem: "Er ging iets mis met het gesprek. Probeer het opnieuw.",
    voiceCallFailed: "Kon het gesprek niet starten.",
    voiceMissingKey: "NEXT_PUBLIC_VAPI_PUBLIC_KEY ontbreekt in .env.local",
    voiceButtonStart: "Praat met de assistent",
    voiceButtonEnd: "Gesprek beëindigen",
    footerTagline: (name) => `${name} — AI-assistent, altijd bereikbaar.`,
    footerLive: "Live agent",
    footerPreview: "Altijd bereikbaar",
  },
  da: {
    badge: "AI-concierge",
    liveOn: (host) => `Live på ${host}`,
    headline: () => ({ before: "Tal med ", after: " — med det samme." }),
    heroFallback:
      "Spørg om åbningstider, ydelser, priser eller book en tid — dag og nat. Ingen ventemusik, ingen telefonjagt.",
    chatTitle: (name) => `Chat med ${name}`,
    chatGreeting: (name) => `Hej! Tak fordi du kigger forbi ${name} — hvad kan jeg hjælpe med?`,
    chatPlaceholder: "Stil et spørgsmål…",
    chatSend: "Send",
    chatStarting: "Starter op…",
    chatThinking: "Tænker…",
    chatMockupReply:
      "Tak for din besked! Dette er en forhåndsvisning af din AI-assistent — den fulde agent er ikke tilsluttet endnu.",
    chatError: "Beklager, noget gik galt.",
    chatUnreachable: "Beklager, jeg kunne ikke få fat i assistenten lige nu.",
    voiceTitle: (name) => `Tal med ${name}`,
    voiceIdle: "Stemme i realtid, drevet af Mindaptive",
    voiceConnecting: "Forbinder…",
    voiceActive: "Jeg lytter — sig endelig noget",
    voiceCallProblem: "Der opstod et problem med opkaldet. Prøv igen.",
    voiceCallFailed: "Opkaldet kunne ikke startes.",
    voiceMissingKey: "NEXT_PUBLIC_VAPI_PUBLIC_KEY mangler i .env.local",
    voiceButtonStart: "Tal med den",
    voiceButtonEnd: "Afslut opkald",
    footerTagline: (name) => `${name} — AI-assistent, altid tilgængelig.`,
    footerLive: "Live-agent",
    footerPreview: "Altid tilgængelig",
  },
};

export function t(locale: Locale | undefined): Strings {
  return STRINGS[locale ?? DEFAULT_LOCALE] ?? STRINGS[DEFAULT_LOCALE];
}
