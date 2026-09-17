import { z } from "zod";

export const PaystackInput = z.object({
  amountNgn: z.number().positive(),
  guestName: z.string().min(1),
  purpose: z.string().min(1),
});

export type PaystackInput = z.infer<typeof PaystackInput>;

/** Tier 3 — must pass HITL approval gate before execute. */
export const paystack_create_payment_link = {
  name: "paystack_create_payment_link",
  description: "Create Paystack payment link for deposit/balance (NGN). Tier 3 gated.",
  safetyTier: 3 as const,
  parameters: PaystackInput,
  async execute(input: PaystackInput, env: { PAYSTACK_SECRET?: string } = {}) {
    const p = PaystackInput.parse(input);
    if (!env.PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET missing — cannot create live link (demo mode: return draft only)");
    const amountKobo = Math.round(p.amountNgn * 100);
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountKobo, currency: "NGN", metadata: { guest: p.guestName, purpose: p.purpose } }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Paystack ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = (await res.json()) as { data?: { authorization_url?: string; reference?: string } };
    return { url: data.data?.authorization_url ?? null, reference: data.data?.reference ?? null, amountNgn: p.amountNgn };
  },
};
