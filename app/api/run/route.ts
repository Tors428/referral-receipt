/**
 * POST /api/run
 *
 * Body: { rawText: string, sourceFixtureId?: string }
 * Returns: RunOutput from the orchestrator.
 *
 * Rate-limited to protect the demo quota. See lib/agent/rate-limit.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/agent/orchestrator";
import { checkRateLimit, getClientIp } from "@/lib/agent/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // ---- Rate limit ----
  const ip = getClientIp(req);
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: limit.message,
        rateLimited: true,
        reason: limit.reason,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSec),
        },
      }
    );
  }

  // ---- Parse body ----
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

  // ---- Run pipeline ----
  try {
    const result = await runPipeline({
      rawText: body.rawText,
      sourceFixtureId: body.sourceFixtureId,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown orchestrator error";
    console.error("[/api/run] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}