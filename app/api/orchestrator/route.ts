import { NextResponse } from "next/server";
import type { OrchestratorDecision, Signal } from "../../../../types";

function route(intent: string): { agent: OrchestratorDecision["assignedAgentId"]; tier: 1 | 2 | 3 } {
  if (intent === "refund_request" || intent === "payment") return { agent: "bookshield", tier: 3 };
  if (intent === "booking_inquiry" || intent === "availability_check" || intent === "faq") return { agent: "bookshield", tier: 2 };
  if (intent === "cleaning" || intent === "checkout" || intent === "checkin") return { agent: "turnovercrew", tier: 2 };
  if (intent === "review" || intent === "repeat_offer") return { agent: "loomstay", tier: 2 };
  if (intent === "emergency") return { agent: "staycore_orchestrator", tier: 3 };
  return { agent: "staycore_orchestrator", tier: 2 };
}

export async function POST(req: Request) {
  const { signal } = (await req.json().catch(() => ({}))) as { signal?: Signal };
  if (!signal) return NextResponse.json({ error: "signal required" }, { status: 400 });
  const r = route(signal.intent);
  const t0 = Date.now();
  const decision: OrchestratorDecision = {
    signalId: signal.id, tenant_id: signal.tenant_id, intent: signal.intent,
    urgency: signal.urgency, assignedAgentId: r.agent, tier: r.tier,
    reasoning: `intent=${signal.intent} urgency=${signal.urgency} → ${r.agent} (tier ${r.tier}, depth 1)`,
    taskId: `task_${Date.now().toString(36)}`, depth: 1, estimatedCostUsd: 0.02,
  };
  return NextResponse.json({ decision, latencyMs: Date.now() - t0 });
}
