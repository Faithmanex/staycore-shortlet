// Shortlet Agentic Platform — shared domain types
// Source: ARCHITECTURE.md Module 3 (Signal) + Module 6 (AuditEvent),
// extended per implementation_plan.md (tenant_id, shortlet intents, NGN costs).

export type SignalSource = "webhook" | "email" | "sms" | "cron" | "manual";
export type SignalProvider =
  | "whatsapp"
  | "instagram"
  | "airbnb"
  | "booking"
  | "sheets"
  | "paystack"
  | "internal"
  | "unknown";

export type ShortletIntent =
  | "booking_inquiry"
  | "availability_check"
  | "payment"
  | "refund_request"
  | "cleaning"
  | "checkout"
  | "checkin"
  | "complaint"
  | "emergency"
  | "review"
  | "repeat_offer"
  | "faq"
  | "unknown";

export type Urgency = 1 | 2 | 3 | 4 | 5;

export interface Signal {
  id: string;
  source: SignalSource;
  provider: SignalProvider;
  rawPayload: Record<string, unknown>;
  normalizedData: {
    customerName?: string;
    contactInfo?: string;
    intent: ShortletIntent | string;
    urgency: Urgency;
    unitIdOrArea?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    amountNgn?: number;
    summary: string;
  };
  // Convenience mirrors required by implementation_plan.md Signal{id, source, provider, urgency, intent, tenant_id}
  intent: string;
  urgency: Urgency;
  tenant_id: string;
  status: "pending" | "assigned" | "dismissed";
  assignedAgentId?: string;
  createdAt: string;
}

export type KanbanStatus =
  | "BACKLOG"
  | "TRIAGE"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "EXECUTING"
  | "RESOLVED";

export interface Task {
  id: string;
  tenant_id: string;
  signalId?: string;
  title: string;
  description?: string;
  status: KanbanStatus;
  assignedAgentId: string;
  payload?: Record<string, unknown>;
  tier?: 1 | 2 | 3;
  costUsd?: number;
  costNgn?: number;
  createdAt: string;
  updatedAt: string;
}

export type ApprovalTier = 1 | 2 | 3;
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "revised"
  | "awaiting_confirm"
  | "executed";

export interface Approval {
  id: string;
  tenant_id: string;
  taskId: string;
  signalId?: string;
  tier: ApprovalTier;
  actionType: string;
  payload: Record<string, unknown>;
  payloadDiff?: { before: unknown; after: unknown };
  status: ApprovalStatus;
  requestedBy: string;
  decidedBy?: string;
  decidedAt?: string;
  confirmToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditActor {
  type: "agent" | "human" | "system";
  id: string;
  name: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  seq: number;
  tenant_id: string;
  taskId: string;
  signalId?: string;
  actor: AuditActor;
  action: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  model: string;
  tokenUsage: { prompt: number; completion: number; totalCostUsd: number };
  costNgn?: number;
  latencyMs: number;
  status: "success" | "failed" | "rejected_by_human" | "pending";
  prevHash: string;
  hash: string;
}

export type AgentId =
  | "staycore_orchestrator"
  | "bookshield"
  | "turnovercrew"
  | "loomstay";

export interface OrchestratorDecision {
  signalId: string;
  tenant_id: string;
  intent: string;
  urgency: Urgency;
  assignedAgentId: AgentId;
  tier: 1 | 2 | 3;
  reasoning: string;
  taskId: string;
  depth: number;
  estimatedCostUsd: number;
}

export const KANBAN_ORDER: KanbanStatus[] = [
  "BACKLOG",
  "TRIAGE",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "EXECUTING",
  "RESOLVED",
];

/** Strict forward transitions. Revise/reject paths handled explicitly in kanban route. */
export const ALLOWED_TRANSITIONS: Record<KanbanStatus, KanbanStatus[]> = {
  BACKLOG: ["TRIAGE"],
  TRIAGE: ["IN_PROGRESS", "BACKLOG"],
  IN_PROGRESS: ["AWAITING_APPROVAL", "TRIAGE"],
  AWAITING_APPROVAL: ["EXECUTING", "IN_PROGRESS"],
  EXECUTING: ["RESOLVED", "AWAITING_APPROVAL"],
  RESOLVED: [],
};
