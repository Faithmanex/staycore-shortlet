"use client";
import { useState } from "react";
import Kanban from "../components/Kanban";
import SignalFeed from "../components/SignalFeed";
import ApprovalDrawer from "../components/ApprovalDrawer";
import AgentTree from "../components/AgentTree";
import AuditLog from "../components/AuditLog";

export default function Page() {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <main style={{ padding: 16, maxWidth: 1560, margin: "0 auto" }}>
      <div className="wt-kicker">StayCore • Lagos luxury shortlets • 5–15 units</div>
      <h1 style={{ margin: "6px 0 2px", fontSize: 22 }}>
        Mission Control <span className="wt-gold">◆</span> <span className="wt-mono" style={{ fontSize: 14 }}>₦1.2M pipeline • 99.1% auto-triage</span>
      </h1>
      <div className="wt-brand-rule" style={{ margin: "10px 0 14px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SignalFeed />
          <AgentTree />
          <AuditLog />
        </div>
        <div>
          <Kanban onFocus={setFocus} />
          {focus && <p className="wt-mono" style={{ fontSize: 12 }}>focused: {focus} — keys: J/K move • A approve • R reject • Esc close</p>}
        </div>
      </div>
      <ApprovalDrawer />
    </main>
  );
}
