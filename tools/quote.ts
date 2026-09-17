import { z } from "zod";

export const QuoteInput = z.object({
  nightlyRate: z.number().nonnegative(),
  nights: z.number().int().positive(),
  cleaningFee: z.number().nonnegative(),
  cautionDeposit: z.number().nonnegative().default(50000),
  discount: z.number().nonnegative().default(0),
});

export type QuoteInput = z.infer<typeof QuoteInput>;

export const quote_builder = {
  name: "quote_builder",
  description: "Build itemized NGN quote: nightly x nights + cleaning + caution - discount",
  safetyTier: 1 as const,
  parameters: QuoteInput,
  async execute(input: QuoteInput) {
    const p = QuoteInput.parse(input);
    const subtotal = p.nightlyRate * p.nights;
    const total = subtotal + p.cleaningFee + p.cautionDeposit - p.discount;
    const lines = [
      `• ${p.nights} night(s) x ₦${p.nightlyRate.toLocaleString()} = ₦${subtotal.toLocaleString()}`,
      `• Cleaning fee: ₦${p.cleaningFee.toLocaleString()}`,
      `• Caution deposit (refundable): ₦${p.cautionDeposit.toLocaleString()}`,
    ];
    if (p.discount > 0) lines.push(`• Discount: -₦${p.discount.toLocaleString()}`);
    lines.push(`• Total due: ₦${total.toLocaleString()}`);
    return { subtotal, total, currency: "NGN", breakdown: lines };
  },
};
