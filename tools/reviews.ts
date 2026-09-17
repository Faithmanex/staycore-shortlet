import { z } from "zod";

export const ReviewInput = z.object({ guestName: z.string().min(1), unitId: z.string().min(1) });

// No inline SVG — Unicode bullets only (invariant).
const TEMPLATE = (g: string, u: string) =>
  `Hello ${g}, thank you for staying with us at ${u} • Hope checkout was smooth • Could you leave us a quick review + a photo if you loved it? • It helps us host you better next time • Reply STOP to opt out`;

export const review_request_sender = {
  name: "review_request_sender",
  description: "Send review prompt via WhatsApp/email. Unicode bullets only.",
  safetyTier: 2 as const,
  parameters: ReviewInput,
  async execute(input: z.infer<typeof ReviewInput>) {
    const p = ReviewInput.parse(input);
    return { to: p.guestName, unitId: p.unitId, body: TEMPLATE(p.guestName, p.unitId), queued: true };
  },
};

export const discount_code_gen = {
  name: "discount_code_gen",
  description: "Generate 10% return-guest code (Tier 2)",
  safetyTier: 2 as const,
  parameters: z.object({ guestName: z.string() }),
  async execute(input: { guestName: string }) {
    const code = `STAY10-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    return { code, percent: 10, guest: input.guestName };
  },
};
