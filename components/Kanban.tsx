"use client";
const COLS = [
  { id: "BACKLOG", title: "Backlog", cls: "wt-b-dormant", count: 6 },
  { id: "TRIAGE", title: "Triage", cls: "wt-b-delegating", count: 3 },
  { id: "IN_PROGRESS", title: "In Progress", cls: "wt-b-executing", count: 2 },
  { id: "AWAITING_APPROVAL", title: "Awaiting Approval", cls: "wt-b-attention", count: 2, ring: "wt-col-awaiting" },
  { id: "EXECUTING", title: "Executing", cls: "wt-b-executing", count: 1, ring: "wt-col-executing" },
  { id: "RESOLVED", title: "Resolved", cls: "wt-b-nominal", count: 48 },
];

export default function Kanban({ onFocus }: { onFocus: (id: string | null) => void }) {
  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Mission Control Kanban">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {COLS.map((c) => (
          <div key={c.id} className={`wt-card ${c.ring ?? ""}`} style={{ padding: 8, minHeight: 220 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{c.title}</span>
              <span className={`wt-badge ${c.cls}`}><span className="wt-ico">{c.id === "AWAITING_APPROVAL" ? "▲" : c.id === "RESOLVED" ? "●" : "■"}</span>{c.count}</span>
            </div>
            {c.id === "AWAITING_APPROVAL" && (
              <button className="wt-btn wt-focusable" onClick={() => onFocus("apr_demo")} style={{ width: "100%", marginBottom: 6 }}>
                ▲ Quote ₦355,000 — Approve
              </button>
            )}
            {c.id === "TRIAGE" && (
              <button className="wt-btn wt-focusable" onClick={() => onFocus("sig_demo")} style={{ width: "100%" }}>
                ◆ WhatsApp inquiry → Dispatch
              </button>
            )}
            <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
              {c.id === "RESOLVED" ? "₦1.2M • 420ms avg" : "mono amounts • no jitter"}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
