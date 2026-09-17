"use client";
const SIGNALS = [
  { id: "sig_demo", from: "WhatsApp • +234 803…", text: "Hi, is 2BR Lekki Phase 1 available Dec 24–26? 4 guests", urgency: 4, intent: "booking_inquiry" },
  { id: "sig_2", from: "Airbnb • Adaeze", text: "Checkout done, left keys in box", urgency: 3, intent: "cleaning" },
  { id: "sig_3", from: "Booking.com • Tunde", text: "Need refund for extra night charged", urgency: 4, intent: "refund_request" },
];

export default function SignalFeed() {
  return (
    <section className="wt-card" style={{ padding: 12 }} aria-label="Signal Triage">
      <h2 style={{ fontSize: 14, margin: "0 0 8px" }}>Signal Triage <span className="wt-badge wt-b-delegating"><span className="wt-ico">◆</span>live</span></h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SIGNALS.map((s) => (
          <div key={s.id} className="wt-inset" style={{ padding: 8 }} tabIndex={0}>
            <div className="wt-mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>{s.from} • {s.id}</div>
            <div style={{ fontSize: 13, margin: "4px 0" }}>{s.text}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span className="wt-mono" style={{ fontSize: 11 }}>urgency {[1, 2, 3, 4, 5].map((i) => (<span key={i} className={`wt-pip ${i <= s.urgency ? "wt-pip-on" : ""}`} />))}</span>
              <span className="wt-badge wt-b-dormant">{s.intent}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button className="wt-btn wt-btn-small wt-focusable">Dispatch</button>
              <button className="wt-btn wt-btn-small wt-focusable">Reroute</button>
              <button className="wt-btn wt-btn-small wt-focusable">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
