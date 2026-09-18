"use client";
import { useCallback, useEffect, useState } from "react";
import type { Task } from "../types";
import { getTasks } from "./api";

const FLEET = [
  { id: "staycore_orchestrator", name: "StayCore", role: "orchestrator" },
  { id: "bookshield", name: "BookShield", role: "inquiry triage" },
  { id: "turnovercrew", name: "TurnoverCrew", role: "cleaning" },
  { id: "loomstay", name: "LoomStay", role: "reviews" },
];

export default function AgentTree({ tick }: { tick: number }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  useEffect(() => {
    getTasks().then(({ tasks }) => setTasks(tasks)).catch(() => undefined);
  }, [tick]);

  function dotFor(agent: string): string {
    const mine = tasks.filter((t) => t.assignedAgentId === agent && t.status !== "RESOLVED");
    if (mine.some((t) => t.status === "EXECUTING" || t.status === "IN_PROGRESS")) return "wt-dot-executing";
    if (mine.some((t) => t.status === "AWAITING_APPROVAL")) return "wt-dot-attention";
    if (mine.length > 0) return "wt-dot-delegating";
    return tasks.some((t) => t.assignedAgentId === agent) ? "wt-dot-nominal" : "wt-dot-dormant";
  }

  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Agent Tree">
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>
        Agent Tree{" "}
        <span className="wt-badge wt-b-delegating">
          <span className="wt-ico">◆</span>handoff
        </span>
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FLEET.map((n) => {
          const mine = tasks.filter((t) => t.assignedAgentId === n.id);
          const open = mine.filter((t) => t.status !== "RESOLVED").length;
          return (
            <div key={n.id} className="wt-inset" style={{ padding: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <span className={`wt-dot ${dotFor(n.id)}`} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{n.name}</div>
                <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                  {n.role} • {open} open / {mine.length} total
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
