import { NextResponse } from "next/server";
import crypto from "crypto";
import type { AuditEvent } from "../../../types";

const events: AuditEvent[] = [];
let seq = 0;

function hash(prev: string, body: unknown): string {
  return crypto.createHash("sha256").update(prev + JSON.stringify(body)).digest("hex");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<AuditEvent> & { taskId?: string; tenant_id?: string; action?: string };
  if (!body.taskId || !body.tenant_id || !body.action) return NextResponse.json({ error: "taskId, tenant_id, action required" }, { status: 400 });
  seq += 1;
  const prev = events.length ? events[events.length - 1].hash : "GENESIS";
  const base = {
    id: `aud_${Date.now().toString(36)}_${seq}`, timestamp: new Date().toISOString(), seq,
    tenant_id: body.tenant_id, taskId: body.taskId, signalId: body.signalId,
    actor: body.actor ?? { type: "agent", id: "staycore_orchestrator", name: "StayCore" },
    action: body.action, toolName: body.toolName, toolInput: body.toolInput, toolOutput: body.toolOutput,
    model: body.model ?? "claude-3-5-haiku",
    tokenUsage: body.tokenUsage ?? { prompt: 800, completion: 400, totalCostUsd: 0.004 },
    costNgn: body.costNgn, latencyMs: body.latencyMs ?? 0,
    status: body.status ?? "success", prevHash: prev,
  } as Omit<AuditEvent, "hash">;
  const ev: AuditEvent = { ...base, hash: hash(prev, base) } as AuditEvent;
  events.unshift(ev);
  return NextResponse.json({ event: ev });
}

export async function GET() {
  return NextResponse.json({ events: events.slice(0, 200) });
}
