import { notFound } from "next/navigation";
import { readLead } from "@/lib/leads";
import HeroBanner from "@/components/HeroBanner";
import ChatWidget from "@/components/ChatWidget";
import VapiWidget from "@/components/VapiWidget";
import { hexToRgba } from "@/lib/color";
import { t } from "@/lib/i18n";
import { isTheme, tokens, onTheme, DEFAULT_THEME } from "@/lib/theme";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { slug } = await params;
  const { theme: themeParam } = await searchParams;
  const lead = await readLead(slug);

  if (!lead) {
    notFound();
  }

  // `?theme=` lets Process A screenshot both variants from the one lead; without
  // it the page uses whichever theme matches the lead's own site.
  const theme = themeParam && isTheme(themeParam) ? themeParam : (lead.theme ?? DEFAULT_THEME);
  const tk = tokens(theme);
  const s = t(lead.locale);

  const [rawPrimary = "#334155", rawAccent = rawPrimary] = lead.branding.colors;
  const primary = onTheme(rawPrimary, theme);
  const accent = onTheme(rawAccent, theme);

  return (
    <main
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        background: `radial-gradient(circle at 15% 8%, ${hexToRgba(primary, tk.pageGlow)}, transparent 55%), radial-gradient(circle at 85% 0%, ${hexToRgba(accent, tk.pageGlow * 0.7)}, transparent 50%), ${tk.pageBg}`,
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${tk.gridOpacity} [background-size:48px_48px]`}
        style={{
          backgroundImage: `linear-gradient(${tk.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${tk.gridLine} 1px, transparent 1px)`,
        }}
      />

      <div className="relative z-10">
        <HeroBanner lead={lead} theme={theme} />

        <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10 lg:px-16">
          <div className="grid gap-5 sm:grid-cols-2">
            <VapiWidget lead={lead} theme={theme} />
            <ChatWidget lead={lead} theme={theme} />
          </div>
        </section>

        <footer
          className="mx-auto max-w-6xl border-t px-6 py-8 text-sm sm:px-10 lg:px-16"
          style={{ borderColor: tk.divider, color: tk.textFaint }}
        >
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <span>{s.footerTagline(lead.businessName)}</span>
            <span>{lead.mode === "live" ? s.footerLive : s.footerPreview}</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
