import type { Approval, AuditEvent, KanbanStatus, OrchestratorDecision, Signal, Task } from "../types";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export const getSignals = () => api<{ signals: Signal[] }>("/api/signals/webhook");
export const postSignal = (body: Record<string, unknown>) =>
  api<{ signal: Signal }>("/api/signals/webhook", { method: "POST", body: JSON.stringify(body) });
export const patchSignal = (id: string, body: Partial<Pick<Signal, "status" | "assignedAgentId">>) =>
  api<{ signal: Signal }>("/api/signals/webhook", { method: "PATCH", body: JSON.stringify({ id, ...body }) });

export const dispatchSignal = (signalId: string) =>
  api<{ decision: OrchestratorDecision; task: Task | null; draftReply: string | null; engine: string; latencyMs: number }>(
    "/api/orchestrator",
    {
      method: "POST",
      body: JSON.stringify({ signalId }),
    },
  );

export const getTasks = () => api<{ tasks: Task[] }>("/api/kanban");
export const patchTask = (id: string, to: KanbanStatus) =>
  api<{ task: Task }>("/api/kanban", { method: "PATCH", body: JSON.stringify({ id, to }) });

export const getApprovals = () => api<{ approvals: Approval[] }>("/api/approvals");
export const patchApproval = (id: string, action: "approve" | "confirm" | "reject" | "revise", confirmToken?: string) =>
  api<{ approval: Approval }>("/api/approvals", { method: "PATCH", body: JSON.stringify({ id, action, confirmToken }) });

export const getAudit = () => api<{ events: AuditEvent[] }>("/api/audit");

export const NEXT_STATUS: Record<Exclude<KanbanStatus, "RESOLVED">, KanbanStatus> = {
  BACKLOG: "TRIAGE",
  TRIAGE: "IN_PROGRESS",
  IN_PROGRESS: "AWAITING_APPROVAL",
  AWAITING_APPROVAL: "EXECUTING",
  EXECUTING: "RESOLVED",
};

export function naira(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  return "₦" + n.toLocaleString("en-NG");
}
