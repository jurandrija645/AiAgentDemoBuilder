import { notFound } from "next/navigation";
import { readLead } from "@/lib/leads";
import HeroBanner from "@/components/HeroBanner";
import ChatWidget from "@/components/ChatWidget";
import VapiWidget from "@/components/VapiWidget";
import { hexToRgba } from "@/lib/color";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lead = await readLead(slug);

  if (!lead) {
    notFound();
  }

  const [primary = "#334155", accent = primary] = lead.branding.colors;
  const s = t(lead.locale);

  return (
    <main
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        background: `radial-gradient(circle at 15% 8%, ${hexToRgba(primary, 0.35)}, transparent 55%), radial-gradient(circle at 85% 0%, ${hexToRgba(accent, 0.25)}, transparent 50%), #06070c`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10">
        <HeroBanner lead={lead} />

        <section className="mx-auto max-w-6xl px-6 pb-16 sm:px-10 lg:px-16">
          <div className="grid gap-5 sm:grid-cols-2">
            <VapiWidget lead={lead} />
            <ChatWidget lead={lead} />
          </div>
        </section>

        <footer
          className="mx-auto max-w-6xl border-t px-6 py-8 text-sm text-white/40 sm:px-10 lg:px-16"
          style={{ borderColor: hexToRgba("#ffffff", 0.08) }}
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
