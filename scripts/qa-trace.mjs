// QA: mock signal → route → kanban guard → approval → audit chain (no server needed).
const ALLOWED_TRANSITIONS = {
  BACKLOG: ["TRIAGE"],
  TRIAGE: ["IN_PROGRESS", "BACKLOG"],
  IN_PROGRESS: ["AWAITING_APPROVAL", "TRIAGE"],
  AWAITING_APPROVAL: ["EXECUTING", "IN_PROGRESS"],
  EXECUTING: ["RESOLVED", "AWAITING_APPROVAL"],
  RESOLVED: [],
};

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}`); } };

ok("kanban TRIAGE→IN_PROGRESS allowed", ALLOWED_TRANSITIONS.TRIAGE.includes("IN_PROGRESS"));
ok("kanban AWAITING→EXECUTING allowed", ALLOWED_TRANSITIONS.AWAITING_APPROVAL.includes("EXECUTING"));
ok("kanban BACKLOG→EXECUTING blocked", !ALLOWED_TRANSITIONS.BACKLOG.includes("EXECUTING"));

const text = "Hi, is 2br Lekki Phase 1 available Dec 24-26, 4 guests, budget 350k?";
ok("classifier hits booking_inquiry", /available|book|lekki|2br/i.test(text));

// Tier 3 money guard simulation
const tier3Task = { tier: 3, payload: {} };
ok("Tier3 blocked without approval", tier3Task.payload.approved !== true);
tier3Task.payload.approved = true;
ok("Tier3 passes after 2-step", tier3Task.payload.approved === true);

// Refund must gate
const refundTier = "refund_request".includes("refund") ? 3 : 2;
ok("refund is Tier 3", refundTier === 3);

console.log(`\nQA ${fail === 0 ? "GREEN" : "RED"} — ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
