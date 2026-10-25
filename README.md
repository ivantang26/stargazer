# Stargazer

**Answers from your business documents, with sources your team can check.**

A bilingual (English / 繁體中文) AI SaaS implementing the PRD *"Stargazer AI SaaS Website Product Requirements v1.0"*: a public marketing website, an anonymous synthetic-data demo, and an authenticated **Knowledge Workspace** where a team uploads approved documents and asks questions whose answers carry citations to the exact source passage.

```bash
npm install
npm run build
npm start        # http://localhost:3000  → redirects to /en
# or: npm run dev
```

No external services or API keys are required. All state lives in `.data/` (SQLite database, private file store, server secret) — delete `.data/` for a factory reset.

**Deploying:** on serverless hosts (Vercel) the project directory is read-only, so state is placed under `/tmp` automatically (detected via `VERCEL=1`) and is **ephemeral** — database, uploads, and signups reset when instances recycle. Fine for a demo deployment; for durable data, set `SG_DATA_DIR` on a host with a persistent disk (VPS, Railway, Render, Fly), or port the data-access boundary (`src/lib/data-access.ts`) to a managed database such as Turso/LibSQL — every table already carries `org_id` for that move.

---

## The complete first-release journey (try it in 5 minutes)

1. **Demo** — open [`/en/demo`](http://localhost:3000/en/demo) (or `/zh-hant/demo`). Ask up to 5 questions about a synthetic company ("Northlight Trading Co."); open a citation to read the passage, version, and section. No registration.
2. **Sign up** — `/en/signup`. Verification emails land in the **development outbox** at [`/dev/outbox`](http://localhost:3000/dev/outbox) (no SMTP in this build); open the link to verify.
3. **Create a workspace** — `/app` walks the onboarding sequence: name the workspace → review document visibility (all members can read shared documents) → upload → wait for *Ready* → first question.
4. **Upload** — `/app/documents` accepts text-based PDF, DOCX, TXT, MD (≤ 10 MB / 200 pages / 500k characters; the strictest limit wins). Duplicate checksums prompt keep-or-replace. Replacing creates a new version atomically; deletion tombstones immediately and cascades into conversations that cited the document.
5. **Ask** — `/app/ask`. English or 繁體中文 regardless of interface language. Answers carry `[n]` citations assembled from server-side metadata; missing evidence produces an honest insufficient-evidence response; contradictory-looking passages are flagged with both documents. Copy includes sources; export the conversation as Markdown.
6. **Subscribe** — `/app/billing` runs a **simulated** payment gateway (clearly labelled; no real charge): pay normally, pay with *delayed confirmation* (entitlement only activates via the reconciled "webhook" — a redirect is never payment evidence), or simulate a decline. Cancel at period end, resume, and simulate renewal failure to exercise the 3-day grace and 30-day read/export window.
7. **Administer** — the staff console at `/app/admin` (leads queue, organizations, content, feature flags). To bootstrap a staff account: sign up + verify normally, then run
   `node -e "const db=require('better-sqlite3')('.data/stargazer.db');db.prepare('UPDATE users SET is_staff=1 WHERE email=?').run('you@example.com')"`
   and sign in again.

## What is implemented (P0 scope, PRD §5)

| PRD area | Implementation |
| --- | --- |
| Bilingual public website (§6, §8) | All routes under `/en` + `/zh-hant` with hreflang alternates: homepage, product, two solution pages, pricing, demo, resources (+6 seeded articles per locale), about, contact (leads queue with reference numbers), security, privacy notice with data inventory, terms |
| Anonymous demo (§9.1) | Synthetic corpus under a reserved demo organization, 5 questions/session, per-IP rate limit, global `demo_enabled` kill switch, labelled dataset |
| Registration & onboarding (§9.2) | Verified email + password, recovery, profile language, org creation starts the 14-day trial, resumable onboarding steps |
| Document ingestion (§10.1) | Type-sniffing validation, limits, checksum duplicates, versioned replacement with atomic swap, historical-version retention (24h unreferenced / 90d referenced), tombstoned deletion + purge, 60-second signed download links |
| Questions & answers (§10.2) | Scope selector, bilingual Q&A, citations from server-controlled metadata, insufficient-evidence and conflict handling, cancel/regenerate/feedback, private conversations with rename/export/delete |
| Roles (§11) | Owner / administrator / member capability matrix, single-use email-bound invitations expiring in 7 days, seats = members + pending invites, reauthenticated ownership transfer |
| Pricing & subscriptions (§12) | Versioned plan catalogue (Trial/Starter HKD 499/Team HKD 1499/Business quoted), atomic answer-unit ledger (reserve → settle/release), 80%/100% notifications, concurrency limits (2/5), upgrade proration per the PRD formula, cancellation at period end, 3-day bounded grace, 30-day read/export windows, webhook dedup + stale-event guard + reconciliation |
| Administration (§13) | Staff console: lead lifecycle, org status (no prompt/document access), content registry, feature flags (pause generation while keeping documents readable) |
| AI behaviour (§14) | Deterministic extractive engine: retrieval (BM25 over mixed EN/中文-bigram tokens), bounded synthesis, citation validation against authorized records, injection-resistant (documents are data, never instructions; no external tools) |
| Technical architecture (§15) | Next.js 14 + TypeScript + Tailwind; centralized tenant-checked data-access layer; background job queue with leases/retries/idempotency; audit trail; privacy-conscious analytics events |
| Privacy & security (§17) | Org identifier on every customer table, per-creator conversation privacy, encrypted-password reauth for destructive actions, org deletion as a durable two-phase workflow, no document/prompt bodies in logs or analytics |
| Localization & SEO (§19) | Locale-prefixed indexable URLs, language-preserving switcher, sitemap, robots excludes `/app`, `/api`, `/invite`, `/dev` |

## Architecture notes & deliberate substitutions

The PRD (§15) proposes Supabase (Auth/Postgres+pgvector/Storage) and Stripe. This build keeps every behavioral requirement while substituting components that need cloud accounts, so the product runs anywhere with zero provisioning:

- **Data layer** — embedded SQLite (`better-sqlite3`) behind `src/lib/data-access.ts`. All tenant checks live there; swapping to Postgres + RLS means porting that one boundary (every table already carries `org_id`).
- **Retrieval** — BM25 scoring in `src/lib/retrieval.ts` maps 1:1 onto the PRD's pgvector retrieval layer; chunk loading is already isolated in `answer-service.ts`.
- **Generation** — a deterministic extractive synthesizer in `src/lib/synthesis.ts`. It cannot hallucinate (it quotes retrieved passages), which also makes the citation contract observable; a hosted-model adapter can replace `synthesize()` without touching persistence, metering, or citations.
- **Payments** — a simulated Stripe-shaped gateway (`src/lib/billing.ts`): checkout sessions → provider events → idempotent webhook processing (event-ID dedupe, monotonic sequence guard, reconciliation). The UI labels every simulated control.
- **Email** — `src/lib/mail.ts` writes to an outbox table rendered at `/dev/outbox`; replace `send()` with a real provider for production.
- **Worker** — an in-process queue drainer (leases, retry with backoff, dedupe keys) started on first database open; the job types mirror the PRD's background processing list.

## Key directories

```
src/
  app/(public)/[locale]/   public website + auth pages (two root layouts)
  app/(workspace)/app/     dashboard, ask, documents, team, usage, billing, settings, admin
  app/(bare)/              standalone flows: invite acceptance, dev outbox
  app/api/                 route handlers (auth, orgs, documents, answers, team, billing, leads, demo, admin)
  lib/                     db, plans (versioned catalogue), entitlements (usage ledger),
                           billing (entitlement state machine), ingest, retrieval, synthesis,
                           answer-service, document-service, org-service, worker, i18n/
```

## Not included (by design, PRD §5 P1/P2)

OCR for scanned PDFs, annual billing, saved answer templates, conversation sharing, integrations, public API, departmental permissions, SSO, and mobile apps. The pricing page shows Business as quoted-only; no purchase button exists for planned products.

## Verified behaviours

`npm run build` (67 routes) and an end-to-end script covering: demo quota exhaustion, signup→verify→workspace→upload→ready→cited answer, duplicate-checksum rejection, document deletion cascading affected conversations, cross-organization isolation (no retrieval leak, no document access), delayed-payment pending state reconciling to an active plan exactly once, seat-limited invitations (single-use, email-bound), lead capture with references, and the two-phase organization-deletion workflow.

---

## UI redesign — the split stage (taste-skill)

The public site was redesigned with the `design-taste-frontend` skill (Leonxlnx/taste-skill).

- **Direction dealt:** *The split stage* (seed 222369781) with the **Erode** type system and a dark-ground palette, adapted to the subject: the dealt proportions kept, the hues taken from the brand and the material — night navy `#101623`, bone ink `#e8e4d8`, one starlight-brass accent `#d9b36a` on the action alone (the PRD's proposed blue-violet reads as the generic AI palette; reverting is a one-line token change in `globals.css`).
- **The idea:** on this page, the engraved celestial atlas — the navigator's trusted, checkable reference — becomes the fixed half of the screen, while the citation ([1] opening its passage) becomes the constellation the product draws between a claim and its source. **The live thing:** type a question on the dark half of the homepage and the light half returns a real cited answer from the demo API.
- **Structure:** atlas-fixed hero with the lowercase `stargazer` wordmark (the signature move: it scales down as the first screen leaves) → three statements pinned against true-size product fragments (`data-ui`) → the live question/answer split → the stars turning about the pole (11s loop) → prices set like a menu with the Peking observatory engraving → the questions as reading text → the first screen of the product already open on a brass field → one quiet footer line.
- **Every interior page (extension, second pass):** about, product, both solutions pages, resources (+ article template), contact, security, privacy, terms, and the five account pages were rebuilt as compositions of the same direction: interior heroes with one archival plate, the input/output two-tone fields on solutions and product, reading documents on a 4/8 rail, the resources list set like programme notes, the privacy data inventory as a real table, and the account pages as the split stage (atlas plate fixed, form in the reading column). The interior frame (nav, footer) sits on the homepage's 48px margins.
- **Workspace:** stays light and reading-first (PRD §7) with Erode headings and the brass accent.
- **Gate:** `lint.mjs` 0 FAIL; `inspect.mjs` (1440/768/390) **0 FAIL** on all 26 public routes across `/en` + `/zh-hant` (home, about, product, solutions ×2, resources, an article, contact, security, privacy, terms, demo, pricing) and on the 5 account pages per locale with `--allow few-pictures,no-footage` (working form pages; the atlas plate carries the brand — padding them with engravings would be ornament).
- **Imagery (all credited in the footer):** *Hemelkaart met Christelijke sterrenbeelden* (Rijksmuseum, CC0, via Wikimedia Commons); *Theoria Veneris et Mercurii* orbit chart (Rijksmuseum, CC0); *Observatoire de Peking* copper engraving, 1736 (J. van der Spyk, public domain); *Starry sky with North Star circled* time-lapse (Thomas Bresson, CC BY 3.0); *Yale's Hartmann astrolabe* photograph (Ragesoss, CC BY-SA 3.0, set on a paper field with a multiply blend); *Victoria Harbour (Hong Kong)* photograph (Mk2010, CC BY-SA 3.0). Files in `public/assets/`, credits in `assets/credits.json`. The interface fragments are the product's own HTML, not screenshots.
