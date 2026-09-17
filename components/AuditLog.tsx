"use client";
const ROWS = [
  { ts: "2026-09-16 23:52:11.042", actor: "agent_bookshield", action: "tool_call.quote_builder", ms: "38ms", cost: "₦6.20 • $0.004" },
  { ts: "2026-09-16 23:52:12.310", actor: "human_owner", action: "approval.approve Tier3 step1", ms: "—", cost: "—" },
  { ts: "2026-09-16 23:52:14.019", actor: "agent_bookshield", action: "tool_call.paystack.link", ms: "612ms", cost: "₦18.40 • $0.012" },
];

export default function AuditLog() {
  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Audit Log">
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Audit Log <span className="wt-badge wt-b-nominal"><span className="wt-ico">●</span>sha256 chained</span></h2>
      <div className="wt-mono" style={{ fontSize: 11 }}>
        {ROWS.map((r, i) => (
          <div key={i} style={{ padding: "6px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
            <div style={{ color: "var(--ink-muted)" }}>{r.ts}</div>
            <div>{r.actor} • {r.action}</div>
            <div style={{ color: "var(--ink-secondary)" }}>{r.ms} • {r.cost} • <button className="wt-btn wt-btn-small wt-focusable">Inspect</button></div>
          </div>
        ))}
      </div>
    </section>
  );
}
