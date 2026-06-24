/**
 * POST /api/draft-outreach
 *
 * Body: { extracted: ExtractedReferral, eligibility: EligibilityResult }
 * Returns: { draft: OutreachDraft, modelUsed: string, latencyMs: number }
 *
 * The caller (Phase 8 UI / agent orchestrator) is responsible for chaining
 * /api/extract → /api/payer/eligibility → /api/draft-outreach.
 */

import { NextRequest, NextResponse } from "next/server";
import { draftOutreach } from "@/lib/agent/draft-outreach";
import { ExtractedReferralSchema } from "@/lib/schemas/referral";
import { EligibilityResultSchema } from "@/lib/schemas/pipeline";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate the two nested payloads explicitly so the caller gets a
  // useful error pointing at the right field path.
  const shape = (body ?? {}) as {
    extracted?: unknown;
    eligibility?: unknown;
  };

  const extractedResult = ExtractedReferralSchema.safeParse(shape.extracted);
  if (!extractedResult.success) {
    return NextResponse.json(
      {
        error: "Field 'extracted' is missing or fails schema validation",
        issues: extractedResult.error.issues.slice(0, 5),
      },
      { status: 400 }
    );
  }

  const eligibilityResult = EligibilityResultSchema.safeParse(shape.eligibility);
  if (!eligibilityResult.success) {
    return NextResponse.json(
      {
        error: "Field 'eligibility' is missing or fails schema validation",
        issues: eligibilityResult.error.issues.slice(0, 5),
      },
      { status: 400 }
    );
  }

  try {
    const result = await draftOutreach({
      extracted: extractedResult.data,
      eligibility: eligibilityResult.data,
    });

    return NextResponse.json({
      draft: result.draft,
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown drafting error";
    console.error("[/api/draft-outreach] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}