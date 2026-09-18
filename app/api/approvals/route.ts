import { NextResponse } from "next/server";
import crypto from "crypto";
import type { Approval } from "../../../types";
import { appendAudit, approvals, markTaskApproved, nextId } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    tenant_id?: string;
    taskId?: string;
    tier?: 1 | 2 | 3;
    actionType?: string;
    payload?: Record<string, unknown>;
  };
  if (!body.tenant_id || !body.taskId || !body.actionType)
    return NextResponse.json({ error: "tenant_id, taskId, actionType required" }, { status: 400 });
  const now = new Date().toISOString();
  const tier = body.tier ?? (body.actionType.includes("refund") || body.actionType.includes("paystack") ? 3 : 2);
  const ap: Approval = {
    id: nextId("apr"),
    tenant_id: body.tenant_id,
    taskId: body.taskId,
    tier,
    actionType: body.actionType,
    payload: body.payload ?? {},
    status: tier === 1 ? "approved" : tier === 3 ? "awaiting_confirm" : "pending",
    requestedBy: "staycore_orchestrator",
    confirmToken: tier === 3 ? crypto.randomBytes(16).toString("hex") : undefined,
    createdAt: now,
    updatedAt: now,
  };
  approvals.set(ap.id, ap);
  if (tier === 1) markTaskApproved(ap.taskId);
  return NextResponse.json({ approval: ap });
}

// action: approve (Tier2 direct, Tier3 step1) | confirm (Tier3 step2 w/ token) | reject | revise
export async function PATCH(req: Request) {
  const { id, action, confirmToken, decidedBy } = (await req.json().catch(() => ({}))) as {
    id?: string;
    action?: string;
    confirmToken?: string;
    decidedBy?: string;
  };
  const ap = id ? approvals.get(id) : undefined;
  if (!ap) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (action === "reject") {
    ap.status = "rejected";
  } else if (action === "revise") {
    ap.status = "revised";
  } else if (action === "approve") {
    if (ap.tier === 3) {
      ap.status = "awaiting_confirm";
    } else {
      ap.status = "approved";
      markTaskApproved(ap.taskId);
    }
  } else if (action === "confirm") {
    if (ap.tier !== 3) return NextResponse.json({ error: "confirm only for Tier 3" }, { status: 422 });
    if (ap.confirmToken !== confirmToken) return NextResponse.json({ error: "bad confirm token" }, { status: 403 });
    ap.status = "approved";
    markTaskApproved(ap.taskId);
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  ap.decidedBy = decidedBy ?? "human_owner";
  ap.decidedAt = new Date().toISOString();
  ap.updatedAt = ap.decidedAt;
  approvals.set(ap.id, ap);
  appendAudit({
    tenant_id: ap.tenant_id,
    taskId: ap.taskId,
    actor: { type: "human", id: ap.decidedBy, name: "Owner" },
    action: `approval.${action}:tier${ap.tier}`,
    status: action === "reject" ? "rejected_by_human" : "success",
  });
  return NextResponse.json({ approval: ap });
}

export async function GET() {
  return NextResponse.json({ approvals: [...approvals.values()].slice(0, 200) });
}
