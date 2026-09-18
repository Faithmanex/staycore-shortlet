import { NextResponse } from "next/server";
import { appendAudit, approvals } from "../../../../lib/store";
import { availability_lookup } from "../../../../tools/availability";
import { quote_builder } from "../../../../tools/quote";
import { paystack_create_payment_link } from "../../../../tools/paystack";
import { photo_proof_check, turnover_dispatch } from "../../../../tools/turnover";
import { discount_code_gen, review_request_sender } from "../../../../tools/reviews";

export const dynamic = "force-dynamic";

const TOOLS = {
  availability_lookup,
  quote_builder,
  paystack_create_payment_link,
  turnover_dispatch,
  photo_proof_check,
  review_request_sender,
  discount_code_gen,
} as const;

type ToolName = keyof typeof TOOLS;

function envFor(name: ToolName): Record<string, string | undefined> {
  return {
    PMS_API_KEY: process.env.PMS_API_KEY,
    SHEETS_ID: process.env.SHEETS_ID,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    PAYSTACK_SECRET: process.env.PAYSTACK_SECRET,
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,
  };
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const { tool, input, tenant_id = "demo-tenant", taskId = "adhoc", approvalId } = (await req.json().catch(
    () => ({}),
  )) as {
    tool?: string;
    input?: unknown;
    tenant_id?: string;
    taskId?: string;
    approvalId?: string;
  };
  if (!tool || !(tool in TOOLS)) return NextResponse.json({ error: `unknown tool (pick: ${Object.keys(TOOLS).join(", ")})` }, { status: 400 });
  const def = TOOLS[tool as ToolName];

  if (def.safetyTier === 3) {
    const ap = approvalId ? approvals.get(approvalId) : undefined;
    if (!ap || ap.status !== "approved") {
      return NextResponse.json({ error: "Tier 3 tool requires an approved approvalId" }, { status: 403 });
    }
  }
  const parsed = def.parameters.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "bad input", issues: parsed.error.issues }, { status: 422 });

  try {
    const output = (await (def.execute as (i: unknown, e: unknown) => Promise<unknown>)(parsed.data, envFor(tool as ToolName))) as Record<
      string,
      unknown
    >;
    appendAudit({
      tenant_id,
      taskId,
      actor: { type: "agent", id: tool, name: tool },
      action: `tool_call.${tool}`,
      toolName: tool,
      toolInput: parsed.data as Record<string, unknown>,
      toolOutput: output,
      latencyMs: Date.now() - t0,
    });
    return NextResponse.json({ output });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    tools: (Object.keys(TOOLS) as ToolName[]).map((name) => ({ name, safetyTier: TOOLS[name].safetyTier, description: TOOLS[name].description })),
  });
}
