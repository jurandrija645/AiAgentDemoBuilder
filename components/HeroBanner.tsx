import type { LeadData } from "@/lib/leads";
import { hexToRgba, readableTextColor } from "@/lib/color";
import { t } from "@/lib/i18n";
import { tokens, onTheme, type Theme } from "@/lib/theme";

export default function HeroBanner({ lead, theme }: { lead: LeadData; theme?: Theme }) {
  const tk = tokens(theme);
  const [rawPrimary = "#334155", rawSecondary = rawPrimary, rawAccent = rawSecondary] =
    lead.branding.colors;
  const primary = onTheme(rawPrimary, theme);
  const accent = onTheme(rawAccent, theme);
  const initial = lead.businessName.trim().charAt(0).toUpperCase() || "?";
  const s = t(lead.locale);
  const headline = s.headline(lead.businessName);

  return (
    <section
      className="relative px-6 pt-10 pb-16 sm:px-10 lg:px-16"
      style={{ color: tk.textPrimary }}
    >
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
        <Brand lead={lead} primary={primary} accent={accent} initial={initial} />
        <span
          className="rounded-full border px-3 py-1 text-xs font-medium tracking-wide uppercase"
          style={{ borderColor: tk.panelBorder, color: tk.textSecondary }}
        >
          {s.badge}
        </span>
      </nav>

      <div className="relative z-10 mx-auto mt-20 max-w-6xl">
        <div className="max-w-2xl">
          <p
            className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: hexToRgba(primary, 0.5), color: primary }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${hexToRgba(accent, 0.9)}` }}
            />
            {s.liveOn(new URL(safeUrl(lead.sourceUrl)).hostname.replace(/^www\./, ""))}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {headline.before}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(90deg, ${primary}, ${accent})` }}
            >
              {lead.businessName}
            </span>
            {headline.after}
          </h1>
          <p
            className="mt-6 max-w-xl text-lg leading-relaxed"
            style={{ color: tk.textSecondary }}
          >
            {lead.branding.metaDescription ?? s.heroFallback}
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * A real logo already carries the company name, so it stands alone — sized up,
 * and free to keep its own aspect ratio since most logos are wordmarks. The
 * generated badge is just an initial, which means nothing on its own, so that
 * case keeps the name beside it.
 */
function Brand({
  lead,
  primary,
  accent,
  initial,
}: {
  lead: LeadData;
  primary: string;
  accent: string;
  initial: string;
}) {
  const logoSrc = lead.branding.logoDataUri || lead.branding.logoUrl;
  if (!lead.branding.logoIsFallback && logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt={lead.businessName}
        className="h-10 w-auto max-w-[220px] object-contain object-left"
      />
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          backgroundImage: `linear-gradient(135deg, ${primary}, ${accent})`,
          color: readableTextColor(primary),
        }}
      >
        {initial}
      </span>
      <span className="text-lg font-semibold tracking-tight">{lead.businessName}</span>
    </div>
  );
}

function safeUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    return "https://example.com";
  }
}
