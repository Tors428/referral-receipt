/**
 * POST /api/payer/eligibility
 *
 * Body: { payerName: string, memberId: string, planType?: string }
 * Returns: EligibilityResult
 *
 * Mocks a clearinghouse X12 270/271 round-trip. See lib/agent/mock-payer.ts
 * for the routing table and rationale.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkEligibility } from "@/lib/agent/mock-payer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { payerName?: string; memberId?: string; planType?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.payerName || typeof body.payerName !== "string") {
    return NextResponse.json(
      { error: "Field 'payerName' is required and must be a string" },
      { status: 400 }
    );
  }

  if (!body.memberId || typeof body.memberId !== "string") {
    return NextResponse.json(
      { error: "Field 'memberId' is required and must be a string" },
      { status: 400 }
    );
  }

  try {
    const result = await checkEligibility({
      payerName: body.payerName,
      memberId: body.memberId,
      planType: body.planType ?? null,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown eligibility error";
    console.error("[/api/payer/eligibility] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}