# StayCore — Shortlet Agentic Platform (Nigeria)

Luxury shortlet ops for 5–15 units. WhatsApp-first inquiry triage, turnover dispatch, Paystack deposits, review booster.

Built with the `smb-agentic-company` factory: 6 modules — Agent Registry, 6-col Kanban, Signal Triage Bus, HITL Gates, Agent Tree, Immutable Audit.

## Run (demo)
```bash
npm i -g pnpm
pnpm i   # or npm i
pnpm dev # Next.js 15 → http://localhost:3000
```

Env: `PAYSTACK_SECRET`, `WHATSAPP_TOKEN`, `SHEETS_ID`, `PMS_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Demo flow (pitch)
1. POST `/api/signals/webhook` `{text:"Hi, is 2BR Lekki Phase 1 available Dec 24-26? 4 guests", provider:"whatsapp"}`
2. POST `/api/orchestrator` `{signal}` → BookShield Tier 2
3. POST `/api/kanban` create task → PATCH `TRIAGE→IN_PROGRESS→AWAITING_APPROVAL`
4. POST `/api/approvals` → PATCH approve (+confirm if Tier 3) → kanban `→EXECUTING→RESOLVED`
5. POST `/api/audit` every step (SHA256 chain).

Refunds/money: always Tier 3, 2-step, never auto.

## Push to GitHub (new repo — this folder is standalone)
```bash
cd shortlet-agentic-platform
git init -b main
git add .
git commit -m "feat: StayCore shortlet platform demo"
gh repo create staycore-shortlet --private --source=. --push
```
