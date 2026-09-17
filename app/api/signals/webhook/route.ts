import { NextResponse } from "next/server";
import type { Signal, Urgency } from "../../../../types";

const store: Signal[] = [];

function classify(text: string): { intent: string; urgency: Urgency } {
  const t = text.toLowerCase();
  if (/locked out|no power|no water|leak|double.?book|emergency/.test(t)) return { intent: "emergency", urgency: 5 };
  if (/refund|charge.*wrong|damage/.test(t)) return { intent: "refund_request", urgency: 4 };
  if (/available|book|weekend|price|rate|2br|3br|lekki|vi|ikoyi/.test(t)) return { intent: "booking_inquiry", urgency: 4 };
  if (/clean|checkout|check.?in|turnover/.test(t)) return { intent: "cleaning", urgency: 3 };
  if (/pay|balance|deposit|paystack|transfer/.test(t)) return { intent: "payment", urgency: 3 };
  if (/review|star|rating/.test(t)) return { intent: "review", urgency: 2 };
  return { intent: "faq", urgency: 2 };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = String(body.text ?? body.message ?? JSON.stringify(body)).slice(0, 2000);
  const { intent, urgency } = classify(text);
  const signal: Signal = {
    id: `sig_${Date.now().toString(36)}`,
    source: (body.source as Signal["source"]) ?? "webhook",
    provider: (body.provider as Signal["provider"]) ?? "whatsapp",
    rawPayload: body,
    normalizedData: {
      customerName: (body.guestName as string) ?? (body.from as string),
      contactInfo: (body.from as string) ?? (body.phone as string),
      intent, urgency, summary: text.slice(0, 280),
      unitIdOrArea: (body.unitId as string) ?? (body.area as string),
    },
    intent, urgency,
    tenant_id: String(body.tenant_id ?? "demo-tenant"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store.unshift(signal);
  return NextResponse.json({ signal });
}

export async function GET() {
  return NextResponse.json({ signals: store.slice(0, 100) });
}
