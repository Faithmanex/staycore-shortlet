export type TaskStatus =
  | "backlog"
  | "triage"
  | "in_progress"
  | "awaiting_approval"
  | "executing"
  | "resolved";

export interface KanbanTask {
  id: string;
  title: string;
  detail: string;
  agent: "staycore_orchestrator" | "bookshield" | "turnovercrew" | "loomstay";
  urgency: 1 | 2 | 3 | 4 | 5;
  status: TaskStatus;
  tier: 1 | 2 | 3;
  amountNgn: number;
  updatedAt: string;
}

export type SignalSource = "WhatsApp" | "Instagram" | "Airbnb" | "Booking.com" | "Cron" | "Email";

export interface Signal {
  id: string;
  source: SignalSource;
  intent: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  summary: string;
  tenant: string;
  receivedAt: string;
}

export interface Approval {
  id: string;
  taskId: string;
  tier: 2 | 3;
  actionType: string;
  requester: string;
  createdAt: string;
  amountNgn: number;
  before: string;
  after: string;
  payloadJson: string;
}

export type AgentState = "nominal" | "attention" | "executing" | "delegating" | "halted" | "dormant";

export interface AgentNode {
  id: string;
  name: string;
  role: string;
  parentId: string | null;
  state: AgentState;
  tool: string;
  latencyMs: number;
  tokensKb: number;
  costUsd: number;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actor: string;
  action: string;
  tool: string;
  model: string;
  latencyMs: number;
  costUsd: number;
  costNgn: number;
}

export const COLUMNS: { id: TaskStatus; title: string; wip: number; hint: string }[] = [
  { id: "backlog", title: "Backlog", wip: 50, hint: "Scheduled & low priority" },
  { id: "triage", title: "Triage", wip: 20, hint: "Awaiting classifier" },
  { id: "in_progress", title: "In Progress", wip: 20, hint: "Reasoning / delegating" },
  { id: "awaiting_approval", title: "Awaiting Approval", wip: 20, hint: "HITL gate" },
  { id: "executing", title: "Executing", wip: 10, hint: "In-flight tool calls" },
  { id: "resolved", title: "Resolved", wip: 200, hint: "Done + audited" },
];

export function formatNgn(n: number): string {
  return "₦" + n.toLocaleString("en-NG");
}
