import { NextResponse } from "next/server";
import crypto from "crypto";
import { ALLOWED_TRANSITIONS, type Approval, type KanbanStatus, type Task } from "../../../types";
import { appendAudit, approvals, nextId, signals, tasks } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ tasks: [...tasks.values()].slice(0, 200) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<Task> & {
    title?: string;
    tenant_id?: string;
    assignedAgentId?: string;
  };
  if (!body.title || !body.tenant_id || !body.assignedAgentId)
    return NextResponse.json({ error: "title, tenant_id, assignedAgentId required" }, { status: 400 });
  const now = new Date().toISOString();
  const task: Task = {
    id: nextId("task"),
    tenant_id: body.tenant_id,
    signalId: body.signalId,
    title: body.title,
    description: body.description,
    status: "TRIAGE",
    assignedAgentId: body.assignedAgentId,
    payload: body.payload,
    tier: body.tier ?? 2,
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(task.id, task);
  appendAudit({
    tenant_id: task.tenant_id,
    taskId: task.id,
    signalId: task.signalId,
    actor: { type: "agent", id: task.assignedAgentId, name: task.assignedAgentId },
    action: "kanban.created:TRIAGE",
  });
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const { id, to } = (await req.json().catch(() => ({}))) as { id?: string; to?: KanbanStatus };
  if (!id || !to) return NextResponse.json({ error: "id and to required" }, { status: 400 });
  const t = tasks.get(id);
  if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (t.status === to) return NextResponse.json({ task: t });
  const allowed = ALLOWED_TRANSITIONS[t.status] ?? [];
  if (!allowed.includes(to)) return NextResponse.json({ error: `illegal ${t.status} → ${to}` }, { status: 422 });
  if (to === "EXECUTING" && t.tier === 3 && (t.payload as Record<string, unknown> | undefined)?.approved !== true) {
    return NextResponse.json({ error: "Tier 3 requires approval (payload.approved=true) before EXECUTING" }, { status: 403 });
  }
  const from = t.status;
  t.status = to;
  t.updatedAt = new Date().toISOString();
  tasks.set(id, t);
  appendAudit({
    tenant_id: t.tenant_id,
    taskId: t.id,
    signalId: t.signalId,
    actor: { type: "human", id: "human_owner", name: "Owner" },
    action: `kanban.transition:${from}→${to}`,
  });
  // Entering the gate stages a matching approval so the drawer has real work.
  if (to === "AWAITING_APPROVAL" && ![...approvals.values()].some((a) => a.taskId === t.id && (a.status === "pending" || a.status === "awaiting_confirm"))) {
    const sig = signals.find((s) => s.id === t.signalId);
    const money = t.tier === 3;
    const payload = t.payload as { draftReply?: string; amountNgn?: number } | undefined;
    const now = new Date().toISOString();
    const ap: Approval = {
      id: nextId("apr"),
      tenant_id: t.tenant_id,
      taskId: t.id,
      signalId: t.signalId,
      tier: t.tier ?? 2,
      actionType: money ? (sig?.intent === "refund_request" ? "refund_review" : "paystack_link") : "quote_draft",
      payload: {
        ...(payload?.amountNgn !== undefined ? { amountNgn: payload.amountNgn } : {}),
        ...(payload?.draftReply ? { lines: [payload.draftReply] } : {}),
      },
      status: t.tier === 1 ? "approved" : t.tier === 3 ? "awaiting_confirm" : "pending",
      requestedBy: t.assignedAgentId,
      confirmToken: money ? crypto.randomBytes(16).toString("hex") : undefined,
      createdAt: now,
      updatedAt: now,
    };
    approvals.set(ap.id, ap);
  }
  return NextResponse.json({ task: t });
}
