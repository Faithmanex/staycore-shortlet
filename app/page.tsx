"use client";
import { useCallback, useEffect, useState } from "react";
import Kanban from "../components/Kanban";
import SignalFeed from "../components/SignalFeed";
import ApprovalDrawer from "../components/ApprovalDrawer";
import AgentTree from "../components/AgentTree";
import AuditLog from "../components/AuditLog";
import { getApprovals, getSignals, getTasks } from "../components/api";

export default function Page() {
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const [kpis, setKpis] = useState({ signals: 0, open: 0, approvals: 0 });

  useEffect(() => {
    Promise.all([getSignals(), getTasks(), getApprovals()])
      .then(([{ signals }, { tasks }, { approvals }]) =>
        setKpis({
          signals: signals.length,
          open: tasks.filter((t) => t.status !== "RESOLVED").length,
          approvals: approvals.filter((a) => a.status === "pending" || a.status === "awaiting_confirm").length,
        }),
      )
      .catch(() => undefined);
  }, [tick]);

  return (
    <main style={{ padding: 16, maxWidth: 1560, margin: "0 auto" }}>
      <div className="wt-kicker">StayCore • Lagos luxury shortlets • 5–15 units</div>
      <h1 style={{ margin: "6px 0 2px", fontSize: 22 }}>
        Mission Control <span className="wt-gold">◆</span>{" "}
        <span className="wt-mono" style={{ fontSize: 14 }}>
          {kpis.signals} signals • {kpis.open} open • {kpis.approvals} awaiting approval
        </span>
      </h1>
      <div className="wt-brand-rule" style={{ margin: "10px 0 14px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SignalFeed tick={tick} bump={bump} />
          <AgentTree tick={tick} />
          <AuditLog tick={tick} />
        </div>
        <div>
          <Kanban tick={tick} bump={bump} />
        </div>
      </div>
      <ApprovalDrawer tick={tick} bump={bump} />
    </main>
  );
}
