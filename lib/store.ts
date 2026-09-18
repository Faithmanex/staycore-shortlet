import crypto from "crypto";
import type { Approval, AuditActor, AuditEvent, Signal, Task } from "../types";

// Single shared store for all API routes.
// NOTE: in-memory = per-instance. Works fully in dev and single-instance
// deploys. For multi-instance persistence, migrate to Supabase
// (supabase/schema.sql is ready; swap these collections for queries).
export const signals: Signal[] = [];
export const tasks = new Map<string, Task>();
export const approvals = new Map<string, Approval>();
export const events: AuditEvent[] = [];
let seq = 0;

export function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

function hash(prev: string, body: unknown): string {
  return crypto.createHash("sha256").update(prev + JSON.stringify(body)).digest("hex");
}

export function appendAudit(input: {
  tenant_id: string;
  taskId: string;
  signalId?: string;
  actor: AuditActor;
  action: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  model?: string;
  tokenUsage?: { prompt: number; completion: number; totalCostUsd: number };
  costNgn?: number;
  latencyMs?: number;
  status?: AuditEvent["status"];
}): AuditEvent {
  seq += 1;
  const prev = events.length ? events[0].hash : "GENESIS";
  const base = {
    id: nextId("aud"),
    timestamp: new Date().toISOString(),
    seq,
    tenant_id: input.tenant_id,
    taskId: input.taskId,
    signalId: input.signalId,
    actor: input.actor,
    action: input.action,
    toolName: input.toolName,
    toolInput: input.toolInput,
    toolOutput: input.toolOutput,
    model: input.model ?? "rules-engine-v1",
    tokenUsage: input.tokenUsage ?? { prompt: 0, completion: 0, totalCostUsd: 0 },
    costNgn: input.costNgn,
    latencyMs: input.latencyMs ?? 0,
    status: input.status ?? "success",
    prevHash: prev,
  };
  const ev: AuditEvent = { ...base, hash: hash(prev, base) };
  events.unshift(ev);
  return ev;
}

/** Called when an approval is granted: unlocks Tier 3 execution. */
export function markTaskApproved(taskId: string): void {
  const t = tasks.get(taskId);
  if (!t) return;
  t.payload = { ...(t.payload ?? {}), approved: true };
  t.updatedAt = new Date().toISOString();
  tasks.set(taskId, t);
}
