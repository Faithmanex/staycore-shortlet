"use client";
import { useCallback, useEffect, useState } from "react";
import type { AuditEvent } from "../types";
import { getAudit } from "./api";

export default function AuditLog({ tick }: { tick: number }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { events } = await getAudit();
      setEvents(events);
    } catch {
      // keep last known rows on transient failure
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, tick]);

  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Audit Log">
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>
        Audit Log{" "}
        <span className="wt-badge wt-b-nominal">
          <span className="wt-ico">●</span>sha256 chained
        </span>
      </h2>
      <div className="wt-mono" style={{ fontSize: 11 }}>
        {events.length === 0 && <div style={{ color: "var(--ink-muted)" }}>No events yet — ingest a signal to start the trail.</div>}
        {events.slice(0, 30).map((r, i) => (
          <div key={r.id} style={{ padding: "6px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
            <div style={{ color: "var(--ink-muted)" }}>{r.timestamp}</div>
            <div>
              {r.actor.id} • {r.action}
            </div>
            <div style={{ color: "var(--ink-secondary)" }}>
              {r.latencyMs}ms • ${r.tokenUsage.totalCostUsd.toFixed(4)}
              {r.costNgn !== undefined ? ` • ₦${r.costNgn.toLocaleString()}` : ""} •{" "}
              <button className="wt-btn wt-btn-small wt-focusable" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                {openId === r.id ? "Hide" : "Inspect"}
              </button>
            </div>
            {openId === r.id && (
              <pre className="wt-inset" style={{ padding: 8, overflowX: "auto", fontSize: 10 }}>
                {JSON.stringify({ toolInput: r.toolInput, toolOutput: r.toolOutput, hash: r.hash, prevHash: r.prevHash }, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
