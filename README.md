# StayCore — Shortlet Agentic Platform (Nigeria)

Luxury shortlet ops for 5–15 units. WhatsApp-first inquiry triage, turnover dispatch, Paystack deposits, review booster.

Live demo: https://staycore-shortlet-35fm34y3e-faithmanexs-projects.vercel.app (redeploys on every `main` push)

## How it works (all wired, no mocks)

```
WhatsApp text → POST /api/signals/webhook → AI triage (Gemini Flash Lite, rules fallback)
  → POST /api/orchestrator → routes to BookShield/TurnoverCrew/LoomStay, creates task, writes audit
  → Kanban TRIAGE → IN_PROGRESS → AWAITING_APPROVAL (auto-stages Tier approval)
  → HITL drawer: Tier 2 = 1-click, Tier 3 = 2-step + unlocks EXECUTING
  → RESOLVED, every step hash-chained in /api/audit
```

Tools execute for real via `POST /api/tools/execute` (Zod-validated, Tier 3 needs an approved `approvalId`):
`quote_builder` · `availability_lookup` · `paystack_create_payment_link` · `turnover_dispatch` · `review_request_sender` · `discount_code_gen`

## Run locally

```bash
npm i
npm run dev   # http://localhost:3000
npm run typecheck
node scripts/qa-trace.mjs        # unit guards (7 checks)
node scripts/qa-e2e.mjs http://localhost:3000   # full loop (20 checks, needs dev server)
```

## Env vars

| Var | Purpose | Without it |
| --- | --- | --- |
| `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`, default `gemini-2.0-flash-lite`) | Real AI triage + reply drafts | Deterministic rules engine (UI badges show `rules`) |
| `PAYSTACK_SECRET` | Live Paystack payment links | Tool errors honestly instead of faking a link |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` | Cleaner dispatch WhatsApp sends | Dispatch records `notified:false`, message still logged |
| `SHEETS_ID` + `GOOGLE_API_KEY` / `PMS_API_KEY` | Real availability lookup | Returns `needsConfig`, never invents availability |

Set them in Vercel → Project → Settings → Environment Variables, then redeploy.

## Persistence note

State is an in-memory store (`lib/store.ts`, shared by all routes) — perfect for demos and single-instance use.
For multi-instance production, point it at Postgres using `supabase/schema.sql` (tables already match the API types).

## Demo flow (pitch, 60 seconds)

1. Click **Load demo** in Signal Triage (or paste a real guest message → Ingest).
2. **Dispatch** → AI draft appears under the signal; task lands in Kanban Triage.
3. Advance the card to **Awaiting Approval** → approval auto-stages with the AI draft as diff.
4. **Approve** (Tier 2: 1 click; Tier 3 refund: 2-step) → advance to Executing → Resolved.
5. Open **Audit Log → Inspect**: every step with actor, latency, cost, SHA256 chain.
