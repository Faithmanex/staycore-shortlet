import { z } from "zod";
import type { Urgency } from "../types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite";

export const TriageSchema = z.object({
  intent: z.enum([
    "booking_inquiry",
    "availability_check",
    "payment",
    "refund_request",
    "cleaning",
    "checkout",
    "checkin",
    "complaint",
    "emergency",
    "review",
    "repeat_offer",
    "faq",
    "unknown",
  ]),
  urgency: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  unitOrArea: z.string().optional(),
  guests: z.number().int().positive().optional(),
  summary: z.string(),
  draftReply: z.string(),
  confidence: z.number().min(0).max(1),
});

export type Triage = z.infer<typeof TriageSchema>;

/** Deterministic fallback when no key is set or the API fails. */
export function rulesTriage(text: string): Triage {
  const t = text.toLowerCase();
  let intent: Triage["intent"] = "faq";
  let urgency: Urgency = 2;
  if (/locked out|no power|no water|leak|double.?book|emergency/.test(t)) {
    intent = "emergency";
    urgency = 5;
  } else if (/refund|charge.*wrong|damage/.test(t)) {
    intent = "refund_request";
    urgency = 4;
  } else if (/available|book|weekend|price|rate|2br|3br|lekki|vi|ikoyi/.test(t)) {
    intent = "booking_inquiry";
    urgency = 4;
  } else if (/clean|checkout|check.?in|turnover/.test(t)) {
    intent = "cleaning";
    urgency = 3;
  } else if (/pay|balance|deposit|paystack|transfer/.test(t)) {
    intent = "payment";
    urgency = 3;
  } else if (/review|star|rating/.test(t)) {
    intent = "review";
    urgency = 2;
  }
  return {
    intent,
    urgency,
    summary: text.slice(0, 280),
    draftReply: "",
    confidence: 0.6,
  };
}

const SYSTEM = `You triage inbound guest messages for StayCore, a luxury shortlet manager in Lagos, Nigeria.
Reply with JSON ONLY, matching this schema:
{"intent": "<one of booking_inquiry|availability_check|payment|refund_request|cleaning|checkout|checkin|complaint|emergency|review|repeat_offer|faq|unknown>", "urgency": <1-5>, "unitOrArea": "<unit/area or null>", "guests": <number or null>, "summary": "<<=140 chars>", "draftReply": "<short premium Nigerian-polite WhatsApp draft, or empty string if nothing to say>", "confidence": <0-1>}
Urgency: 5 = guest locked out / no power / no water / leak / double-booking / emergency. 4 = same-day booking or refund demand. 3 = booking question, cleaning, payment. 2 = review/faq. 1 = spam/promo.
Never promise refunds, free upgrades, or confirmed bookings in draftReply. Use • bullets for prices. Keep draftReply under 60 words.`;

export interface TriageResult {
  triage: Triage;
  engine: string;
  latencyMs: number;
  costUsd: number;
}

export async function triageSignal(text: string): Promise<TriageResult> {
  const t0 = Date.now();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { triage: rulesTriage(text), engine: "rules-engine-v1", latencyMs: Date.now() - t0, costUsd: 0 };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: text.slice(0, 2000) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "{}";
    const triage = TriageSchema.parse(JSON.parse(raw));
    const inTok = data.usageMetadata?.promptTokenCount ?? 0;
    const outTok = data.usageMetadata?.candidatesTokenCount ?? 0;
    // gemini-2.0-flash-lite list pricing approx: $0.075 / $0.30 per 1M tokens
    const costUsd = (inTok * 0.075 + outTok * 0.3) / 1_000_000;
    return { triage, engine: MODEL, latencyMs: Date.now() - t0, costUsd };
  } catch {
    return { triage: rulesTriage(text), engine: "rules-fallback", latencyMs: Date.now() - t0, costUsd: 0 };
  }
}
