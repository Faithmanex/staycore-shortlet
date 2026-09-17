"use client";
import { useState } from "react";

export default function ApprovalDrawer() {
  const [open, setOpen] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  if (!open) return <button className="wt-btn wt-focusable" onClick={() => setOpen(true)}>▲ Open approval queue (1)</button>;
  return (
    <div role="dialog" aria-label="HITL Approval Gate">
      <div className="wt-drawer-veil" onClick={() => setOpen(false)} />
      <aside className="wt-drawer" style={{ padding: 16 }}>
        <span className="wt-badge wt-b-attention"><span className="wt-ico">▲</span>Tier 3 • explicit diff + 2-step</span>
        <h2 style={{ fontSize: 16 }}>Quote ₦355,000 — 2BR Lekki Dec 24–26</h2>
        <div className="wt-inset wt-mono" style={{ fontSize: 12, padding: 10, whiteSpace: "pre-wrap" }}>
          <div className="wt-diff-add">+ 2 nights x ₦140,000 = ₦280,000</div>
          <div className="wt-diff-add">+ Cleaning: ₦25,000 • Caution: ₦50,000</div>
          <div className="wt-diff-del">- No refund promise (removed by guardrail)</div>
          <div>+ Paystack link: ₦355,000 • guest: Chidi • purpose: deposit</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {!confirmed ? (
            <button className="wt-btn wt-btn-gold wt-focusable" onClick={() => setConfirmed(true)}>Approve — step 1/2</button>
          ) : (
            <button className="wt-btn wt-btn-gold wt-focusable" onClick={() => setOpen(false)}>Confirm send — step 2/2</button>
          )}
          <button className="wt-btn wt-focusable">Revise</button>
          <button className="wt-btn wt-btn-danger wt-focusable" onClick={() => setOpen(false)}>Reject</button>
        </div>
        <p className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>actor: human_owner • model: claude-3-5-sonnet • 420ms • $0.0142 • Esc closes</p>
      </aside>
    </div>
  );
}
