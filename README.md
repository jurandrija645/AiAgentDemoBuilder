# Lead Demo Generator

A local-only tool for cold outreach: generate a branded AI-demo landing page for
a lead's business in seconds (**Process A**), then turn it into a real,
grounded chat + voice agent once they've booked a call (**Process B**).

Nothing here is deployed. It's `npm run dev` on your machine plus two scripts.

## One-time setup

```bash
npm install
npx playwright install chromium   # ~300MB, only needed once
cp .env.local.example .env.local  # then fill in the keys below
```

`.env.local`:

| Variable | Where to get it | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Chat route (Process B) |
| `VAPI_API_KEY` | Vapi dashboard → Private API Keys | `build-agent` script (Process B) |
| `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Vapi dashboard → Public API Keys | Voice widget in the browser (Process B) |

`VAPI_ANTHROPIC_MODEL` / `VAPI_VOICE_PROVIDER` / `VAPI_VOICE_ID` are optional
overrides — see the comments in `.env.local.example`.

Keep the dev server running in its own terminal for both scripts below:

```bash
npm run dev
```

## Deliverable 1 — the hero mockup (Process A)

For a fresh lead, before you've talked to them. Scrapes their site, brands a
landing page in their name/logo/colors with a chat + voice widget UI (visually
present, not wired up), and screenshots it — ready to drop into a cold DM or
email.

```bash
npm run generate-hero -- --url=https://example.com --name="Business Name"
```

- `--url` — required, the lead's website
- `--name` — optional; if omitted, the script infers it from the site (falls
  back to asking you if it can't)

```bash
npm run generate-hero -- --url=https://example.de --name="Business Name" --locale=de
```

**Output**, in under 30 seconds:
- `leads/<slug>/lead.json` — the lead's branding data, `mode: "mockup"`
- `leads/<slug>/screenshots/hero.png` — the screenshot to send
- Page live at `http://localhost:3000/leads/<slug>` for the whole session

`--locale` sets the page's language (`en` default, `de` available). Copy lives
in `lib/i18n.ts` — add a locale there to support another language.

If scraping fails (site blocks bots, times out, etc.) it'll ask you for the
business name / logo URL in the terminal instead of crashing.

## Deliverable 2 — the live agent (Process B)

Run this once the lead books a meeting, right before the call. Crawls a few
more pages of their site (home, about, services, contact — up to 5 total),
builds a knowledge base, creates a real Claude-powered chat agent and a real
Vapi voice assistant grounded in that content, and flips the same page over to
`mode: "live"` — no new page, no redeploy, just re-run the script.

```bash
npm run build-agent -- --slug=<slug-from-process-a>
```

**Output**, in a couple minutes:
- `leads/<slug>/knowledge-base.md` — the crawled site content, hand-editable
- `leads/<slug>/agent.json` — the Vapi assistant id
- `leads/<slug>/lead.json` flipped to `mode: "live"`
- The chat widget on `http://localhost:3000/leads/<slug>` now calls Claude for
  real, grounded in the crawled site content
- The "Talk to it" button starts a real Vapi voice call using the same
  knowledge base

If the crawl comes back with barely any text, the script will warn you — some
sites render their content with JavaScript, which the crawler can't execute.

## Notes

- One folder per lead under `leads/`, no database:

  ```
  leads/sonnenpuls/
    lead.json           branding + mode — what the page renders from
    knowledge-base.md   Process B, plain text so you can edit it by hand
    agent.json          Process B, the Vapi assistant id
    screenshots/
      hero.png          Process A
      live.png          Process B
  ```

  `lib/leads.ts` owns those paths — `readLead` assembles the files into one
  `LeadData`, `writeLead` splits it back out, so nothing else has to know the
  layout. Both scripts are idempotent per slug; re-running `build-agent`
  refreshes the knowledge base and creates a new Vapi assistant.
- `leads/` is committed — each lead's branding, knowledge base and screenshots
  are work product, so they live in git history alongside the code.
- `HeroBanner`, `ChatWidget`, and `VapiWidget` are generic — they read
  `lead.mode` at request time rather than being regenerated per lead, so
  Process B never touches code, only the lead's JSON file.
