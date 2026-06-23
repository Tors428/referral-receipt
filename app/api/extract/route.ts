/**
 * POST /api/extract
 *
 * Body: { rawText: string, sourceFixtureId?: string }
 * Returns: { extracted, modelUsed, latencyMs }
 *
 * Errors return { error: string } with appropriate HTTP status.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractReferral } from "@/lib/agent/extract";

export const runtime = "nodejs";

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
    const result = await extractReferral({
      rawText: body.rawText,
      sourceFixtureId: body.sourceFixtureId,
    });

    return NextResponse.json({
      extracted: result.extracted,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown extraction error";
    console.error("[/api/extract] error:", message);
    return NextResponse.json({ error: message }, { status: 500 }); 
  }
}