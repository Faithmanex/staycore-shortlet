import { z } from "zod";

export const AvailabilityInput = z.object({
  unitId_or_area: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  guests: z.number().int().positive(),
});

export type AvailabilityInput = z.infer<typeof AvailabilityInput>;

export const availability_lookup = {
  name: "availability_lookup",
  description: "Check Sheets/PMS calendar for unit availability over date range",
  safetyTier: 1 as const,
  parameters: AvailabilityInput,
  async execute(input: AvailabilityInput, env: { SHEETS_ID?: string; PMS_API_KEY?: string } = {}) {
    const parsed = AvailabilityInput.parse(input);
    try {
      if (env.PMS_API_KEY) {
        const res = await fetch(`https://pms.example.com/v1/availability?unit=${encodeURIComponent(parsed.unitId_or_area)}&in=${encodeURIComponent(parsed.checkIn)}&out=${encodeURIComponent(parsed.checkOut)}`, {
          headers: { Authorization: `Bearer ${env.PMS_API_KEY}` },
        });
        if (!res.ok) throw new Error(`PMS ${res.status}`);
        const data = (await res.json()) as { available?: boolean; units?: unknown };
        return { available: Boolean(data.available), source: "pms", detail: data };
      }
      if (env.SHEETS_ID) {
        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.SHEETS_ID}/values/Bookings!A:E?key=${(env as Record<string, string>).GOOGLE_API_KEY ?? ""}`);
        if (!res.ok) throw new Error(`Sheets ${res.status}`);
        const data = await res.json();
        return { available: true, source: "sheets", note: "manual-review-recommended", detail: data };
      }
      return { available: null, source: "none", note: "no PMS/Sheets configured — treat as unavailable, ask human", needsConfig: true };
    } catch (err) {
      return { available: null, source: "error", error: err instanceof Error ? err.message : String(err) };
    }
  },
};
