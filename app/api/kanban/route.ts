import { NextResponse } from "next/server";
import { ALLOWED_TRANSITIONS, type KanbanStatus, type Task } from "../../../types";

const tasks = new Map<string, Task>();

export async function GET() {
  return NextResponse.json({ tasks: [...tasks.values()].slice(0, 200) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<Task> & { title?: string; tenant_id?: string; assignedAgentId?: string };
  if (!body.title || !body.tenant_id || !body.assignedAgentId) return NextResponse.json({ error: "title, tenant_id, assignedAgentId required" }, { status: 400 });
  const now = new Date().toISOString();
  const task: Task = {
    id: `task_${Date.now().toString(36)}`, tenant_id: body.tenant_id, signalId: body.signalId,
    title: body.title, description: body.description, status: "TRIAGE",
    assignedAgentId: body.assignedAgentId, payload: body.payload, tier: body.tier ?? 2,
    createdAt: now, updatedAt: now,
  };
  tasks.set(task.id, task);
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
  // Money guard: Tier 3 tasks may only enter EXECUTING via approvals route (sets approved flag in payload)
  if (to === "EXECUTING" && t.tier === 3 && (t.payload as Record<string, unknown> | undefined)?.approved !== true) {
    return NextResponse.json({ error: "Tier 3 requires approval (payload.approved=true) before EXECUTING" }, { status: 403 });
  }
  t.status = to;
  t.updatedAt = new Date().toISOString();
  tasks.set(id, t);
  return NextResponse.json({ task: t });
}
