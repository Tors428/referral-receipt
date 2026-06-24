/**
 * POST /api/run
 *
 * Body: { rawText: string, sourceFixtureId?: string }
 * Returns: RunOutput from the orchestrator — extracted, eligibility,
 *          draft, audit trace, review flags, status.
 *
 * This is the single endpoint the UI will call. The individual stage
 * endpoints (/api/extract, /api/payer/eligibility, /api/draft-outreach)
 * remain available for debugging and for developers who want to wire
 * the pipeline differently.
 */

import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agent/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { rawText?: string; sourceFixtureId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.rawText || typeof body.rawText !== "string") {
    return NextResponse.json(
      { error: "Field 'rawText' is required and must be a string" },
      { status: 400 }
    );
  }

  if (body.rawText.length > 20_000) {
    return NextResponse.json(
      { error: "Referral text exceeds 20,000 character limit" },
      { status: 400 }
    );
  }

  try {
    const result = await runPipeline({
      rawText: body.rawText,
      sourceFixtureId: body.sourceFixtureId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown orchestrator error";
    console.error("[/api/run] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}