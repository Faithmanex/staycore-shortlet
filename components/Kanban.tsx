"use client";
import { useCallback, useEffect, useState } from "react";
import type { KanbanStatus, Task } from "../types";
import { getTasks, NEXT_STATUS, patchTask } from "./api";

const COLS: { id: KanbanStatus; title: string; cls: string; ring?: string }[] = [
  { id: "BACKLOG", title: "Backlog", cls: "wt-b-dormant" },
  { id: "TRIAGE", title: "Triage", cls: "wt-b-delegating" },
  { id: "IN_PROGRESS", title: "In Progress", cls: "wt-b-executing" },
  { id: "AWAITING_APPROVAL", title: "Awaiting Approval", cls: "wt-b-attention", ring: "wt-col-awaiting" },
  { id: "EXECUTING", title: "Executing", cls: "wt-b-executing", ring: "wt-col-executing" },
  { id: "RESOLVED", title: "Resolved", cls: "wt-b-nominal" },
];

export default function Kanban({ tick, bump }: { tick: number; bump: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { tasks } = await getTasks();
      setTasks(tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, tick]);

  async function advance(t: Task) {
    if (t.status === "RESOLVED") return;
    const to = NEXT_STATUS[t.status];
    setBusy(t.id);
    setError(null);
    try {
      await patchTask(t.id, to);
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Mission Control Kanban">
      {error && <div className="wt-badge wt-b-halted" style={{ marginBottom: 8 }}><span className="wt-ico">■</span>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {COLS.map((c) => {
          const items = tasks.filter((t) => t.status === c.id);
          return (
            <div key={c.id} className={`wt-card ${c.ring ?? ""}`} style={{ padding: 8, minHeight: 220 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{c.title}</span>
                <span className={`wt-badge ${c.cls}`}>
                  <span className="wt-ico">{c.id === "AWAITING_APPROVAL" ? "▲" : c.id === "RESOLVED" ? "●" : "■"}</span>
                  {items.length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((t) => (
                  <div key={t.id} className="wt-inset" style={{ padding: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{t.title}</div>
                    <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                      {t.assignedAgentId} • T{t.tier} • urg {(t.payload as { urgency?: number } | undefined)?.urgency ?? "—"}
                      {(t.payload as { engine?: string } | undefined)?.engine
                        ? ` • ${(t.payload as { engine?: string }).engine === "rules-engine-v1" || (t.payload as { engine?: string }).engine === "rules-fallback" ? "rules" : "AI"}`
                        : ""}
                    </div>
                    {t.status !== "RESOLVED" && (
                      <button
                        className="wt-btn wt-btn-small wt-focusable"
                        style={{ marginTop: 6, width: "100%" }}
                        disabled={busy === t.id}
                        onClick={() => void advance(t)}
                      >
                        {busy === t.id ? "Moving…" : `→ ${NEXT_STATUS[t.status].replace(/_/g, " ")}`}
                      </button>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
