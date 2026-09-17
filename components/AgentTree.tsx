"use client";
const NODES = [
  { id: "StayCore", role: "orchestrator", dot: "wt-dot-delegating", chip: "5 tasks • $0.21" },
  { id: "BookShield", role: "inquiry triage", dot: "wt-dot-executing", chip: "quote ₦355k • 420ms" },
  { id: "TurnoverCrew", role: "cleaning", dot: "wt-dot-attention", chip: "Unit B12 • SLA 2:10 left" },
  { id: "LoomStay", role: "reviews", dot: "wt-dot-nominal", chip: "12 asks • 4.8★" },
];

export default function AgentTree() {
  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Agent Tree">
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Agent Tree <span className="wt-badge wt-b-delegating"><span className="wt-ico">◆</span>handoff</span></h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {NODES.map((n) => (
          <div key={n.id} className="wt-inset" style={{ padding: 8, display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`wt-dot ${n.dot}`} />
            <div><div style={{ fontWeight: 700, fontSize: 13 }}>{n.id}</div><div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>{n.role} • {n.chip}</div></div>
          </div>
        ))}
      </div>
    </section>
  );
}
