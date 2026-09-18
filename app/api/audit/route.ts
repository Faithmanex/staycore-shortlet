import { NextResponse } from "next/server";
import type { AuditEvent } from "../../../types";
import { appendAudit, events } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<AuditEvent> & {
    taskId?: string;
    tenant_id?: string;
    action?: string;
  };
  if (!body.taskId || !body.tenant_id || !body.action)
    return NextResponse.json({ error: "taskId, tenant_id, action required" }, { status: 400 });
  const ev = appendAudit({
    tenant_id: body.tenant_id,
    taskId: body.taskId,
    signalId: body.signalId,
    actor: body.actor ?? { type: "agent", id: "staycore_orchestrator", name: "StayCore" },
    action: body.action,
    toolName: body.toolName,
    toolInput: body.toolInput,
    toolOutput: body.toolOutput,
    model: body.model,
    tokenUsage: body.tokenUsage,
    costNgn: body.costNgn,
    latencyMs: body.latencyMs,
    status: body.status,
  });
  return NextResponse.json({ event: ev });
}

export async function GET() {
  return NextResponse.json({ events: events.slice(0, 200) });
}
