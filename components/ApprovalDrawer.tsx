"use client";
import { useCallback, useEffect, useState } from "react";
import type { Approval } from "../types";
import { getApprovals, naira, patchApproval } from "./api";

export default function ApprovalDrawer({ tick, bump }: { tick: number; bump: () => void }) {
  const [items, setItems] = useState<Approval[]>([]);
  const [open, setOpen] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { approvals } = await getApprovals();
      setItems(approvals);
      setSelId((prev) => prev ?? approvals.find((a) => a.status === "pending" || a.status === "awaiting_confirm")?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, tick]);

  const queue = items.filter((a) => a.status === "pending" || a.status === "awaiting_confirm");
  const sel = items.find((a) => a.id === selId) ?? queue[0];

  // A approve/step-1, R reject, Esc close (skipped while typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.key === "Escape") setOpen(false);
      if (!open || !sel || busy) return;
      if (e.key === "a" || e.key === "A") void act(sel, "approve");
      else if (e.key === "r" || e.key === "R") void act(sel, "reject");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selId, busy, items]);

  async function act(a: Approval, action: "approve" | "confirm" | "reject" | "revise") {
    setBusy(true);
    setError(null);
    try {
      const { approval } = await patchApproval(a.id, action, a.confirmToken);
      if (action === "approve" && approval.status === "awaiting_confirm") {
        setSelId(approval.id);
      }
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button className="wt-btn wt-focusable" onClick={() => setOpen(true)}>
        ▲ Open approval queue ({queue.length})
      </button>
    );
  if (!sel)
    return (
      <div role="dialog" aria-label="HITL Approval Gate">
        <div className="wt-drawer-veil" onClick={() => setOpen(false)} />
        <aside className="wt-drawer" style={{ padding: 16 }}>
          <span className="wt-badge wt-b-nominal"><span className="wt-ico">●</span>queue clear</span>
          <p style={{ fontSize: 13 }}>No pending approvals. Dispatch a signal to create work.</p>
          <button className="wt-btn wt-focusable" onClick={() => setOpen(false)}>Close (Esc)</button>
        </aside>
      </div>
    );

  const payload = sel.payload as { amountNgn?: number; lines?: string[] } & Record<string, unknown>;
  return (
    <div role="dialog" aria-label="HITL Approval Gate">
      <div className="wt-drawer-veil" onClick={() => setOpen(false)} />
      <aside className="wt-drawer" style={{ padding: 16 }}>
        <span className="wt-badge wt-b-attention">
          <span className="wt-ico">▲</span>Tier {sel.tier} • {sel.status === "awaiting_confirm" ? "step 2/2 confirm" : sel.tier === 3 ? "explicit diff + 2-step" : "1-click"}
        </span>
        <h2 style={{ fontSize: 16 }}>{sel.actionType} • {naira(payload.amountNgn)}</h2>
        <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          task {sel.taskId} • by {sel.requestedBy}
        </div>
        {queue.length > 1 && (
          <div style={{ display: "flex", gap: 6, margin: "8px 0", flexWrap: "wrap" }}>
            {queue.map((q) => (
              <button
                key={q.id}
                className="wt-btn wt-btn-small wt-focusable"
                style={q.id === sel.id ? { borderColor: "var(--status-attention)" } : undefined}
                onClick={() => setSelId(q.id)}
              >
                T{q.tier} {q.actionType}
              </button>
            ))}
          </div>
        )}
        <div className="wt-inset wt-mono" style={{ fontSize: 12, padding: 10, whiteSpace: "pre-wrap" }}>
          {payload.lines && Array.isArray(payload.lines)
            ? (payload.lines as string[]).map((l, i) => <div key={i} className="wt-diff-add">+ {l}</div>)
            : JSON.stringify(sel.payload, null, 2)}
        </div>
        {error && <div className="wt-badge wt-b-halted" style={{ marginTop: 8 }}><span className="wt-ico">■</span>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {sel.status === "awaiting_confirm" ? (
            <button className="wt-btn wt-btn-gold wt-focusable" disabled={busy} onClick={() => void act(sel, "confirm")}>
              {busy ? "Confirming…" : "Confirm send — step 2/2"}
            </button>
          ) : (
            <button className="wt-btn wt-btn-gold wt-focusable" disabled={busy} onClick={() => void act(sel, "approve")}>
              {busy ? "Working…" : sel.tier === 3 ? "Approve — step 1/2" : "Approve (A)"}
            </button>
          )}
          <button className="wt-btn wt-focusable" disabled={busy} onClick={() => void act(sel, "revise")}>Revise</button>
          <button className="wt-btn wt-btn-danger wt-focusable" disabled={busy} onClick={() => void act(sel, "reject")}>Reject (R)</button>
        </div>
        <p className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
          decided as human_owner • A approve • R reject • Esc close
        </p>
      </aside>
    </div>
  );
}
