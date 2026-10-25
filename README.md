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

## UI design

The public site and workspace share one plain, product-first system:

- **Type:** Geist Sans and Geist Mono via `next/font` (self-hosted, no external font requests); Chinese text falls back to PingFang TC, Microsoft JhengHei or Noto Sans TC.
- **Colour:** a neutral zinc scale and one green accent (`#1f7a55`, `#4cbf8a` in dark mode). The public site follows the system light/dark setting; tokens live at the top of `src/app/globals.css` and are exposed to Tailwind as `ps-*` colours.
- **Shape:** two radii only, 8px for controls and 14px for panels and images.
- **Icons:** Phosphor (`@phosphor-icons/react`).
- **Homepage:** split hero with the working demo question box (real answers and citations from `/api/demo/ask`), how it works, a four-cell feature grid built from real interface pieces, a Hong Kong/data-handling band, pricing summary, FAQ and a closing call to action.
- **Interior pages** share `src/components/public/` (`PageHero`, `Section`, `AnswerCard`, `DocLayout`, `WorkflowPage`).
- **Imagery:** *Victoria Harbour (Hong Kong)* photograph (Mk2010, CC BY-SA 3.0, via Wikimedia Commons), credited in the footer.
