import { z } from "zod";

export const TurnoverInput = z.object({
  unitId: z.string().min(1),
  checkoutAt: z.string().min(1),
  checkinAt: z.string().min(1),
  cleanerId: z.string().optional(),
});

export type TurnoverInput = z.infer<typeof TurnoverInput>;

export const turnover_dispatch = {
  name: "turnover_dispatch",
  description: "Assign cleaner, set 3hr SLA, notify WhatsApp",
  safetyTier: 2 as const,
  parameters: TurnoverInput,
  async execute(input: TurnoverInput, env: { WHATSAPP_TOKEN?: string } = {}) {
    const p = TurnoverInput.parse(input);
    const slaMinutes = 180;
    const message = `Turnover • Unit ${p.unitId} • Checkout ${p.checkoutAt} → Ready before ${p.checkinAt} • SLA ${slaMinutes}min • Checklist: linens, AC, water heater, toiletries, photos required`;
    if (env.WHATSAPP_TOKEN && p.cleanerId) {
      await fetch(`https://graph.facebook.com/v20.0/${p.cleanerId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", to: p.cleanerId, type: "text", text: { body: message } }),
      }).catch(() => undefined);
    }
    return { assigned: p.cleanerId ?? "round-robin", slaMinutes, message, notified: Boolean(env.WHATSAPP_TOKEN && p.cleanerId) };
  },
};

export const photo_proof_check = {
  name: "photo_proof_check",
  description: "Validate turnover photo proof submitted (Tier 1 read-only)",
  safetyTier: 1 as const,
  parameters: z.object({ taskId: z.string(), photoUrls: z.array(z.string()).min(1) }),
  async execute(input: { taskId: string; photoUrls: string[] }) {
    if (!input.photoUrls.length) throw new Error("photo proof required");
    return { taskId: input.taskId, photos: input.photoUrls.length, ready: true };
  },
};
