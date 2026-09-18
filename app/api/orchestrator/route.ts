import { NextResponse } from "next/server";
import type { OrchestratorDecision, Signal, Task } from "../../../types";
import { appendAudit, nextId, signals, tasks } from "../../../lib/store";
import { triageSignal } from "../../../lib/llm";

export const dynamic = "force-dynamic";

function route(intent: string): { agent: OrchestratorDecision["assignedAgentId"]; tier: 1 | 2 | 3 } {
  if (intent === "refund_request" || intent === "payment" || intent === "emergency")
    return { agent: intent === "emergency" ? "staycore_orchestrator" : "bookshield", tier: 3 };
  if (intent === "booking_inquiry" || intent === "availability_check" || intent === "faq")
    return { agent: "bookshield", tier: 2 };
  if (intent === "cleaning" || intent === "checkout" || intent === "checkin")
    return { agent: "turnovercrew", tier: 2 };
  if (intent === "review" || intent === "repeat_offer") return { agent: "loomstay", tier: 2 };
  return { agent: "staycore_orchestrator", tier: 2 };
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const { signal, signalId, createTask = true } = (await req.json().catch(() => ({}))) as {
    signal?: Signal;
    signalId?: string;
    createTask?: boolean;
  };
  const sig = signal ?? signals.find((x) => x.id === signalId);
  if (!sig) return NextResponse.json({ error: "signal required" }, { status: 400 });

  // Real AI triage (Gemini when GEMINI_API_KEY is set, rules fallback otherwise).
  const sourceText = String(sig.rawPayload?.text ?? sig.rawPayload?.message ?? sig.normalizedData.summary);
  const { triage, engine, latencyMs: aiMs, costUsd } = await triageSignal(sourceText);
  sig.intent = triage.intent;
  sig.urgency = triage.urgency;
  sig.normalizedData.summary = triage.summary;
  if (triage.unitOrArea) sig.normalizedData.unitIdOrArea = triage.unitOrArea;
  if (triage.guests) sig.normalizedData.guests = triage.guests;

  const r = route(sig.intent);
  const taskId = nextId("task");
  const decision: OrchestratorDecision = {
    signalId: sig.id,
    tenant_id: sig.tenant_id,
    intent: sig.intent,
    urgency: sig.urgency,
    assignedAgentId: r.agent,
    tier: r.tier,
    reasoning: `${engine}: intent=${sig.intent} urgency=${sig.urgency} conf=${triage.confidence} → ${r.agent} (tier ${r.tier})`,
    taskId,
    depth: 1,
    estimatedCostUsd: costUsd,
  };

  let task: Task | undefined;
  if (createTask) {
    const now = new Date().toISOString();
    task = {
      id: taskId,
      tenant_id: sig.tenant_id,
      signalId: sig.id,
      title: `${sig.intent}: ${triage.summary.slice(0, 80)}`,
      description: triage.summary,
      status: "TRIAGE",
      assignedAgentId: r.agent,
      payload: { urgency: sig.urgency, engine, draftReply: triage.draftReply || undefined },
      tier: r.tier,
      costUsd,
      createdAt: now,
      updatedAt: now,
    };
    tasks.set(task.id, task);
    sig.status = "assigned";
    sig.assignedAgentId = r.agent;
    appendAudit({
      tenant_id: sig.tenant_id,
      taskId: task.id,
      signalId: sig.id,
      actor: { type: "agent", id: "staycore_orchestrator", name: "StayCore" },
      action: `orchestrator.dispatched:${r.agent}`,
      model: engine,
      tokenUsage: { prompt: 0, completion: 0, totalCostUsd: costUsd },
      latencyMs: Date.now() - t0,
    });
  }
  return NextResponse.json({ decision, task: task ?? null, draftReply: triage.draftReply || null, engine, latencyMs: Date.now() - t0 });
}
