// E2E: exercises the live signal → dispatch → kanban → approval → execute → audit loop.
// Usage: node scripts/qa-e2e.mjs [baseUrl]   (default http://localhost:3000)
const BASE = process.argv[2] ?? "http://localhost:3000";
let pass = 0;
let fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
};

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const text = "Hi, is 2br Lekki Phase 1 available Dec 24-26, 4 guests, budget 350k?";
const s1 = await call("POST", "/api/signals/webhook", { text, from: "+2348030000001", provider: "whatsapp" });
ok("ingest signal", s1.status === 200 && s1.data.signal?.intent === "booking_inquiry", JSON.stringify(s1.data).slice(0, 200));
const signal = s1.data.signal;

const o1 = await call("POST", "/api/orchestrator", { signalId: signal.id });
ok("dispatch creates task", o1.status === 200 && o1.data.task?.status === "TRIAGE", JSON.stringify(o1.data).slice(0, 200));
const task = o1.data.task;
ok("routed to bookshield tier2", o1.data.decision?.assignedAgentId === "bookshield" && o1.data.decision?.tier === 2);

const k1 = await call("PATCH", "/api/kanban", { id: task.id, to: "IN_PROGRESS" });
ok("TRIAGE→IN_PROGRESS", k1.status === 200 && k1.data.task?.status === "IN_PROGRESS", `got ${k1.status} ${JSON.stringify(k1.data).slice(0, 160)}`);
const kBad = await call("PATCH", "/api/kanban", { id: task.id, to: "RESOLVED" });
ok("illegal skip blocked (422)", kBad.status === 422);
const k2 = await call("PATCH", "/api/kanban", { id: task.id, to: "AWAITING_APPROVAL" });
ok("IN_PROGRESS→AWAITING_APPROVAL", k2.status === 200);

const a1 = await call("POST", "/api/approvals", {
  tenant_id: "demo-tenant",
  taskId: task.id,
  tier: 3,
  actionType: "paystack_link",
  payload: { amountNgn: 355000, lines: ["2 nights x ₦140,000 = ₦280,000", "Cleaning ₦25,000", "Caution ₦50,000"] },
});
ok("tier3 approval staged", a1.status === 200 && a1.data.approval?.status === "awaiting_confirm");
const approval = a1.data.approval;

const k3 = await call("PATCH", "/api/kanban", { id: task.id, to: "EXECUTING" });
ok("tier2 EXECUTING needs no money gate", k3.status === 200, `got ${k3.status}`);

// Flow B: refund → tier-3 task. EXECUTING must 403 until 2-step approval done.
// Uses the approval auto-created when the task enters AWAITING_APPROVAL.
const r1 = await call("POST", "/api/signals/webhook", { text: "I need a refund for the extra night charged on my card", from: "+2348030000002", provider: "booking" });
ok("refund signal tier", r1.data.signal?.intent === "refund_request", JSON.stringify(r1.data.signal)?.slice(0, 120));
const r2 = await call("POST", "/api/orchestrator", { signalId: r1.data.signal.id });
ok("refund → tier3 task", r2.data.decision?.tier === 3 && r2.data.task?.tier === 3);
const rTask = r2.data.task;
await call("PATCH", "/api/kanban", { id: rTask.id, to: "IN_PROGRESS" });
await call("PATCH", "/api/kanban", { id: rTask.id, to: "AWAITING_APPROVAL" });
const r3 = await call("PATCH", "/api/kanban", { id: rTask.id, to: "EXECUTING" });
ok("tier3 EXECUTING blocked pre-approval (403)", r3.status === 403, `got ${r3.status}`);
const al = await call("GET", "/api/approvals");
const auto = (al.data.approvals ?? []).find((a) => a.taskId === rTask.id && (a.status === "pending" || a.status === "awaiting_confirm"));
ok("approval auto-created at gate", Boolean(auto) && auto.tier === 3, JSON.stringify(auto)?.slice(0, 160));
await call("PATCH", "/api/approvals", { id: auto.id, action: "approve" });
await call("PATCH", "/api/approvals", { id: auto.id, action: "confirm", confirmToken: auto.confirmToken });
const r4 = await call("PATCH", "/api/kanban", { id: rTask.id, to: "EXECUTING" });
ok("tier3 EXECUTING after 2-step", r4.status === 200, `got ${r4.status} ${JSON.stringify(r4.data).slice(0, 120)}`);

const a2 = await call("PATCH", "/api/approvals", { id: approval.id, action: "approve" });
ok("approve step 1/2", a2.status === 200 && a2.data.approval?.status === "awaiting_confirm");
const a3 = await call("PATCH", "/api/approvals", { id: approval.id, action: "confirm", confirmToken: approval.confirmToken });
ok("confirm step 2/2", a3.status === 200 && a3.data.approval?.status === "approved");

const k4 = await call("PATCH", "/api/kanban", { id: task.id, to: "EXECUTING" });
ok("EXECUTING after approval", k4.status === 200);
const k5 = await call("PATCH", "/api/kanban", { id: task.id, to: "RESOLVED" });
ok("EXECUTING→RESOLVED", k5.status === 200);

const q1 = await call("POST", "/api/tools/execute", {
  tool: "quote_builder",
  input: { nightlyRate: 140000, nights: 2, cleaningFee: 25000, cautionDeposit: 50000 },
});
ok("quote tool totals ₦355,000", q1.status === 200 && q1.data.output?.total === 355000, JSON.stringify(q1.data).slice(0, 160));

const p1 = await call("POST", "/api/tools/execute", {
  tool: "paystack_create_payment_link",
  input: { amountNgn: 355000, guestName: "Chidi", purpose: "deposit" },
});
ok("tier3 tool blocked without approvalId (403)", p1.status === 403);

const au = await call("GET", "/api/audit");
const actions = (au.data.events ?? []).map((e) => e.action);
ok("audit trail recorded", au.status === 200 && actions.includes("signal.received:booking_inquiry") && actions.some((a) => a.startsWith("approval.confirm")), `${actions.length} events`);

console.log(`\nE2E ${fail === 0 ? "GREEN" : "RED"} — ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
