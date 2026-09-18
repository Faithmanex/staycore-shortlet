"use client";
import { useCallback, useEffect, useState } from "react";
import type { Signal } from "../types";
import { dispatchSignal, getSignals, patchSignal, postSignal } from "./api";

const DEMO = [
  { from: "+234 803 123 4567", provider: "whatsapp", text: "Hi, is 2BR Lekki Phase 1 available Dec 24–26? 4 guests, budget 350k" },
  { from: "Adaeze (Airbnb)", provider: "airbnb", text: "Checkout done, left keys in lockbox. Unit B12" },
  { from: "Tunde (Booking.com)", provider: "booking", text: "I need a refund for the extra night charged on my card" },
];

const AGENTS = ["bookshield", "turnovercrew", "loomstay"] as const;

export default function SignalFeed({ tick, bump }: { tick: number; bump: () => void }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [provider, setProvider] = useState("whatsapp");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, { text: string; engine: string }>>({});

  const load = useCallback(async () => {
    try {
      const { signals } = await getSignals();
      setSignals(signals);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, tick]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      bump();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  // J/K navigate, X dispatch selected, Del dismiss selected (skipped while typing)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      if (e.key === "j" || e.key === "J") setSel((s) => Math.min(s + 1, Math.max(0, signals.length - 1)));
      else if (e.key === "k" || e.key === "K") setSel((s) => Math.max(0, s - 1));
      else if ((e.key === "x" || e.key === "X") && signals[sel]) {
        const id = signals[sel].id;
        void run(`dispatch-${id}`, async () => {
          const { draftReply, engine } = await dispatchSignal(id);
          if (draftReply) setDrafts((d) => ({ ...d, [id]: { text: draftReply, engine } }));
        });
      } else if ((e.key === "Delete" || e.key === "Backspace") && signals[sel]) {
        const id = signals[sel].id;
        void run(`dismiss-${id}`, () => patchSignal(id, { status: "dismissed" }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [signals, sel]);

  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Signal Triage">
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>
        Signal Triage{" "}
        <span className="wt-badge wt-b-delegating">
          <span className="wt-ico">◆</span>live
        </span>
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        <textarea
          className="wt-inset wt-focusable"
          style={{ color: "var(--ink-primary)", fontSize: 13, padding: 8, minHeight: 56, resize: "vertical" }}
          placeholder="Paste a guest WhatsApp message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6 }}>
          <input
            className="wt-inset wt-focusable"
            style={{ color: "var(--ink-primary)", fontSize: 12, padding: 6, flex: 1 }}
            placeholder="From (e.g. +234…)"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <select
            className="wt-inset wt-focusable"
            style={{ color: "var(--ink-primary)", fontSize: 12, padding: 6 }}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="wt-btn wt-btn-gold wt-focusable"
            disabled={!text.trim() || busy === "send"}
            onClick={() => void run("send", () => postSignal({ text, from, provider }).then(() => setText("")))}
          >
            {busy === "send" ? "Sending…" : "Ingest signal"}
          </button>
          <button
            className="wt-btn wt-focusable"
            disabled={busy === "demo"}
            onClick={() =>
              void run("demo", async () => {
                for (const d of DEMO) await postSignal({ text: d.text, from: d.from, provider: d.provider });
              })
            }
          >
            {busy === "demo" ? "Loading…" : "Load demo"}
          </button>
        </div>
      </div>
      {error && <div className="wt-badge wt-b-halted" style={{ marginBottom: 8 }}><span className="wt-ico">■</span>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {signals.length === 0 && <div className="wt-mono" style={{ fontSize: 12, color: "var(--ink-muted)" }}>No signals yet — ingest one above or load demo.</div>}
        {signals.map((s, i) => (
          <div
            key={s.id}
            className="wt-inset"
            style={{ padding: 8, outline: i === sel ? "1px solid var(--status-delegating)" : "none" }}
            tabIndex={0}
            onClick={() => setSel(i)}
          >
            <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
              {s.provider} • {s.normalizedData.customerName ?? "unknown"} • {s.id}
            </div>
            <div style={{ fontSize: 13, margin: "4px 0" }}>{s.normalizedData.summary}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span className="wt-mono" style={{ fontSize: 11 }} title={`urgency ${s.urgency}`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`wt-pip ${n <= s.urgency ? "wt-pip-on" : ""}`} />
                ))}
              </span>
              <span className="wt-badge wt-b-dormant">{s.intent}</span>
              <span className="wt-badge wt-b-dormant">{s.status}</span>
            </div>
            {drafts[s.id] && (
              <div className="wt-inset wt-mono" style={{ fontSize: 11, padding: 6, marginTop: 6 }}>
                <span className="wt-badge wt-b-delegating" style={{ marginBottom: 4 }}>
                  <span className="wt-ico">◆</span>AI draft • {drafts[s.id].engine}
                </span>
                <div style={{ marginTop: 4 }}>{drafts[s.id].text}</div>
              </div>
            )}
            {s.status === "pending" && (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button
                  className="wt-btn wt-btn-small wt-focusable"
                  disabled={busy === `dispatch-${s.id}`}
                  onClick={() =>
                    void run(`dispatch-${s.id}`, async () => {
                      const { draftReply, engine } = await dispatchSignal(s.id);
                      if (draftReply) setDrafts((d) => ({ ...d, [s.id]: { text: draftReply, engine } }));
                    })
                  }
                >
                  Dispatch
                </button>
                <button
                  className="wt-btn wt-btn-small wt-focusable"
                  disabled={busy === `reroute-${s.id}`}
                  onClick={() =>
                    void run(`reroute-${s.id}`, () => {
                      const next = AGENTS[(AGENTS.indexOf((s.assignedAgentId as (typeof AGENTS)[number]) ?? "bookshield") + 1) % AGENTS.length];
                      return patchSignal(s.id, { status: "assigned", assignedAgentId: next });
                    })
                  }
                >
                  Reroute
                </button>
                <button
                  className="wt-btn wt-btn-small wt-focusable"
                  disabled={busy === `dismiss-${s.id}`}
                  onClick={() => void run(`dismiss-${s.id}`, () => patchSignal(s.id, { status: "dismissed" }))}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)", margin: "8px 0 0" }}>keys: J/K navigate • X dispatch • Del dismiss</p>
    </section>
  );
}
