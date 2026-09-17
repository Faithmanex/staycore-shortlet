# Shortlet Agentic Platform — Implementation Plan (Nigeria, Starter 5-15 units)
Version: 2.0.0 | Factory: smb-agentic-company | Date: 2026-09-16
Status: Awaiting owner approval to build (/goal)

## 1. Alignment Summary (grill-me results)
- **Vertical:** Shortlet / Airbnb manager, Lagos starter (5-15 units, Lekki/VI/Ikoyi pattern)
- **Top pain:** Inquiry triage (WhatsApp + Instagram + Airbnb/Booking messages) — 10+ hrs/week lost on slow replies, double-booking risk
- **Secondary:** Cleaning dispatch (checkout→check-in turnaround), payments/deposits, reviews
- **Current stack:** WhatsApp Business + Instagram DM (primary), Airbnb/Booking.com OTAs, Sheets/manual PMS (no Hostex/Guesty yet), Paystack/Flutterwave assumed
- **Safety posture:** Aggressive ops (auto-replies + auto cleaning tasks) BUT all refunds/money movements gated — Tier 3 HITL required
- **Brand:** Luxury gold/black overlay on Warm Terminal (semantic tokens preserved)

## 2. Target Customer for Pitch
Owner-operator with 8 units in Lekki Phase 1, 1 cleaner team (2-3 cleaners), 1 inspector, uses WhatsApp + Sheets, takes bank transfer + Paystack link, lists on Airbnb + Booking + Instagram.

Pitch ROI: <60s reply 24/7 → +25% booking conversion, zero double-booking, 3hr turnover tracked, review auto-ask → 4.8★+.

## 3. Agent Fleet (config.json)
```json
{
  "version": "2.0.0",
  "company": {"name": "StayCore Demo", "industry": "shortlet_hospitality_nigeria", "description": "Luxury shortlet ops for 5-15 units — WhatsApp-first inquiry triage, turnover dispatch, Paystack deposits, review booster", "timezone": "Africa/Lagos", "currency": "NGN"},
  "llm": {"provider": "anthropic", "fastModel": "claude-3-5-haiku", "reasoningModel": "claude-3-5-sonnet", "dailyTokenBudget": 2000000, "maxCostPerTaskUsd": 0.5},
  "agents": [
    {"id": "staycore_orchestrator", "name": "StayCore", "role": "Master Orchestrator — classifies signals, routes to workers, enforces budget", "modelTier": "reasoning", "safetyTier": 2, "systemPrompt": "You are StayCore, supervisor for a Lagos luxury shortlet fleet (5-15 units). Classify every signal by intent (booking_inquiry, availability_check, payment, cleaning, complaint, review) and urgency 1-5. Emergency = guest locked out / no power / no water / double-booking conflict. Never auto-charge or auto-refund. Route money actions to HITL gate. Scope all PII to tenant_id.", "tools": ["availability_lookup", "quote_builder"], "maxConcurrentTasks": 5},
    {"id": "bookshield", "name": "BookShield", "role": "Inquiry Triage — 60s WhatsApp/IG/Airbnb reply drafter, availability + quote", "parentSupervisorId": "staycore_orchestrator", "modelTier": "fast", "safetyTier": 2, "systemPrompt": "You are BookShield. Reply in premium, short, Nigerian-polite tone. Steps: 1) extract dates/guests/unit, 2) check availability_lookup, 3) build quote (nightly* nights + cleaning fee + caution deposit), 4) draft reply + Paystack link request. Never confirm booking without availability hit. Never promise refund.", "channels": ["whatsapp", "instagram", "airbnb"], "tools": ["availability_lookup", "quote_builder", "paystack_create_payment_link"], "maxConcurrentTasks": 5},
    {"id": "turnovercrew", "name": "TurnoverCrew", "role": "Cleaning dispatch — checkout→inspect→check-in pipeline driver", "parentSupervisorId": "staycore_orchestrator", "modelTier": "fast", "safetyTier": 2, "systemPrompt": "You drive turnovers. On checkout signal create BACKLOG→TRIAGE task, assign cleaner by zone, set SLA 3hrs, require photo proof, escalate if overdue 30min. Auto-create tasks (Tier 1/2) but damage charges go to gate.", "channels": ["whatsapp", "internal"], "tools": ["turnover_dispatch", "photo_proof_check"], "maxConcurrentTasks": 5},
    {"id": "loomstay", "name": "LoomStay", "role": "Guest delight — payment nudges, review booster, repeat offers", "parentSupervisorId": "staycore_orchestrator", "modelTier": "fast", "safetyTier": 2, "systemPrompt": "You handle post-checkout: 1 day after checkout ask for review + photos, if 5★ offer 10% return code, if complaint open rescue task. Payment balance reminders polite, 2 touches max before human.", "channels": ["whatsapp", "email"], "tools": ["review_request_sender", "discount_code_gen"], "maxConcurrentTasks": 5}
  ],
  "deepTools": {
    "availability_lookup": {"name": "availability_lookup", "description": "Check Sheets/PMS calendar for unit availability over date range", "category": "pms", "safetyTier": 1, "handler": "tools/availability.ts", "envKeys": ["SHEETS_ID", "PMS_API_KEY"], "parameters": {"type": "object", "required": ["unitId_or_area", "checkIn", "checkOut", "guests"], "properties": {"unitId_or_area": {"type": "string"}, "checkIn": {"type": "string"}, "checkOut": {"type": "string"}, "guests": {"type": "number"}}}},
    "quote_builder": {"name": "quote_builder", "description": "Build itemized NGN quote: nightly x nights + cleaning + caution", "category": "pricing", "safetyTier": 1, "handler": "tools/quote.ts", "envKeys": [], "parameters": {"type": "object", "required": ["nightlyRate", "nights", "cleaningFee"], "properties": {"nightlyRate": {"type": "number"}, "nights": {"type": "number"}, "cleaningFee": {"type": "number"}, "cautionDeposit": {"type": "number"}, "discount": {"type": "number"}}}},
    "paystack_create_payment_link": {"name": "paystack_create_payment_link", "description": "Create Paystack payment link for deposit/balance (NGN). Tier 3 gated if refund.", "category": "payments", "safetyTier": 3, "handler": "tools/paystack.ts", "envKeys": ["PAYSTACK_SECRET"], "parameters": {"type": "object", "required": ["amountNgn", "guestName", "purpose"], "properties": {"amountNgn": {"type": "number"}, "guestName": {"type": "string"}, "purpose": {"type": "string"}}}},
    "turnover_dispatch": {"name": "turnover_dispatch", "description": "Assign cleaner, set SLA, notify WhatsApp", "category": "ops", "safetyTier": 2, "handler": "tools/turnover.ts", "envKeys": ["WHATSAPP_TOKEN"], "parameters": {"type": "object", "required": ["unitId", "checkoutAt", "checkinAt"], "properties": {"unitId": {"type": "string"}, "checkoutAt": {"type": "string"}, "checkinAt": {"type": "string"}, "cleanerId": {"type": "string"}}}},
    "review_request_sender": {"name": "review_request_sender", "description": "Send review prompt via WhatsApp/email. No inline SVG, Unicode bullets only.", "category": "marketing", "safetyTier": 2, "handler": "tools/reviews.ts", "envKeys": ["WHATSAPP_TOKEN"], "parameters": {"type": "object", "required": ["guestName", "unitId"], "properties": {"guestName": {"type": "string"}, "unitId": {"type": "string"}}}}
  },
  "kanban": {"columns": [
    {"id": "backlog", "title": "Backlog", "colorToken": "status-dormant", "wipLimit": 50},
    {"id": "triage", "title": "Triage", "colorToken": "status-delegating", "wipLimit": 20},
    {"id": "in_progress", "title": "In Progress", "colorToken": "status-executing", "wipLimit": 20},
    {"id": "awaiting_approval", "title": "Awaiting Approval", "colorToken": "status-attention", "wipLimit": 20},
    {"id": "executing", "title": "Executing", "colorToken": "status-executing", "wipLimit": 10},
    {"id": "resolved", "title": "Resolved", "colorToken": "status-nominal", "wipLimit": 200}
  ]},
  "approvalGates": {"notificationChannel": "all", "rules": [
    {"id": "faq-auto", "actionType": "faq_reply", "tier": 1, "condition": "no price/commitment", "autoApproveIf": "confidence>0.9"},
    {"id": "quote-reply", "actionType": "quote_draft", "tier": 2, "condition": "quote < NGN 500k, existing availability hit", "autoApproveIf": "none — 1-click approve"},
    {"id": "cleaning-dispatch", "actionType": "turnover_assign", "tier": 2, "condition": "standard turnover", "autoApproveIf": "auto in aggressive mode, logged"},
    {"id": "money-move", "actionType": "paystack_link, refund, damage_charge, discount>20k", "tier": 3, "condition": "ANY money movement or refund", "autoApproveIf": "never — explicit diff + 2-step confirm"}
  ]},
  "audit": {"retentionDays": 90, "tamperEvidentSha256": true, "logPayloads": true}
}
```

## 4. Backend (Next.js 15 App Router)
- `/api/signals/webhook` — normalizes WhatsApp/IG/Airbnb/Booking/Sheets cron → Signal{source, provider, urgency 1-5, intent, tenant_id}
- `/api/orchestrator` — StayCore classify → delegate to BookShield/TurnoverCrew/LoomStay, enforce token cap + recursion depth 3
- `/api/kanban` — CRUD + optimistic transitions BACKLOG→TRIAGE→IN_PROGRESS→AWAITING_APPROVAL→EXECUTING→RESOLVED
- `/api/approvals` — Tier 2 quick-approve / Tier 3 diff modal + 2-step confirm, actor=human_owner logged
- `/api/audit` — append-only SHA256-chained events: timestamp mono, actor, tool I/O, model, latencyMs, costUsd/NGN
- DB: Supabase/Postgres RLS by tenant_id/org_id. No PII cross-leak.

## 5. Frontend — Warm Terminal + Luxury gold/black accent
- Tokens: canvas #09090b, card #121215, border #27272a, focus #6366f1 2px+2px offset. Semantic: emerald nominal, amber attention, cyan executing, violet delegating, crimson halted, slate dormant. Mono for ₦ amounts/costs/latency. Accent: gold #d4af37 for headers/CTA only — never for status.
- Components: 6-col Kanban (counts, WIP), Signal Triage feed (source badge, urgency, 1-click Dispatch/Reroute/Dismiss), HITL Drawer (payload diff, Approve/Reject/Revise, J/K/A/R/Esc shortcuts), Agent Tree (StayCore→BookShield/TurnoverCrew/LoomStay→tools, live pulses), Audit Log (mono timestamp, actor, tool, ms, $/₦).
- Do-not: no pastel status, no inline SVG in email (• bullets), no full-page shifts on background completes, no money move skipping Column 4, no hidden costs.

## 6. QA Verifier (must pass before done)
1. `tsc --noEmit` clean
2. E2E trace: mock WhatsApp inquiry (“2br Lekki Phase 1 Dec 24-26, 4 guests, budget 350k?”) → Signal urgency 3 → BookShield quote ₦280k+25k cleaning+50k caution → AWAITING_APPROVAL → human Approve → paystack link mock → EXECUTING → RESOLVED → audit has prompt hash, latency, cost
3. Negative: refund request → stays in AWAITING_APPROVAL, 2-step required, no auto-execute
4. Turnover overdue → amber escalation, audit logged

## 7. /goal Build Order (parallel subagents)
1. agent-architect → config.json + prompts
2. integration-builder → 5 typed MCP tools w/ Zod + Tier tags + real Paystack/WhatsApp clients
3. backend-builder → 5 routes + Supabase schema + RLS
4. frontend-builder → Kanban + Triage + HITL Drawer + Tree + Audit, gold/black theme
5. qa-verifier → tsc + E2E + replay check

## 8. Fastest Demo Script (for pitch)
1. Show WhatsApp mock: “Hi, is 2br available this weekend??” → appears in Triage in 2s, urgency 4
2. Click Dispatch → BookShield drafts luxury quote → moves to In Progress (cyan pulse) → Awaiting Approval (amber ring)
3. Owner 1-click Approves → Executing (paystack link sent) → Resolved with ₦ cost + 420ms chip
4. Show Turnover card auto-created for cleaners + Review nudge scheduled
5. Close: “This runs 24/7 while you sleep. ₦150k setup, ₦70k/mo. Want your 8 units loaded?”

---
Approve to trigger /goal autonomous build? Reply “build” to start.
