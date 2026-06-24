/**
 * Pipeline orchestrator.
 *
 * Chains the four stages of the referral-to-visit agent into a single
 * call, emitting an audit trace as it goes.
 *
 *   1. Ingest    — record the incoming raw text
 *   2. Extract   — LLM call #1, structured FHIR-shaped output
 *   3. Eligibility — mock X12 270/271 against payer routing table
 *   4. Draft     — LLM call #2, patient outreach
 *   5. Flag      — walk extraction for low-confidence fields
 *
 * Errors are caught per-stage so partial traces are still returned to
 * the caller. A failed stage seals the trace and skips downstream stages.
 */

import { extractReferral } from "./extract";
import { checkEligibility } from "./mock-payer";
import { draftOutreach } from "./draft-outreach";
import {
  TraceBuilder,
  buildIngestStep,
  buildExtractStep,
  buildEligibilityStep,
  buildOutreachStep,
  buildReviewFlagsStep,
  buildCompleteStep,
  buildErrorStep,
} from "./audit-trace";
import {
  ExtractedReferral,
  collectReviewFlags,
} from "@/lib/schemas/referral";
import {
  AuditTrace,
  EligibilityResult,
  OutreachDraft,
} from "@/lib/schemas/pipeline";

export type RunInput = {
  rawText: string;
  sourceFixtureId?: string;
};

export type RunOutput = {
  trace: AuditTrace;
  extracted: ExtractedReferral | null;
  eligibility: EligibilityResult | null;
  draft: OutreachDraft | null;
  reviewFlags: ReturnType<typeof collectReviewFlags>;
  status: "complete" | "failed";
};

export async function runPipeline(input: RunInput): Promise<RunOutput> {
  const builder = new TraceBuilder();
  const pipelineStart = Date.now();

  let extracted: ExtractedReferral | null = null;
  let eligibility: EligibilityResult | null = null;
  let draft: OutreachDraft | null = null;
  let reviewFlags: ReturnType<typeof collectReviewFlags> = [];

  /* ---- 1. Ingest ---- */
  const ingestStart = Date.now();
  builder.addStep(
    buildIngestStep(
      input.rawText.length,
      input.sourceFixtureId,
      Date.now() - ingestStart
    )
  );

  /* ---- 2. Extract ---- */
  try {
    const extractStart = Date.now();
    const ex = await extractReferral({
      rawText: input.rawText,
      sourceFixtureId: input.sourceFixtureId,
    });
    extracted = ex.extracted;

    reviewFlags = collectReviewFlags(extracted);

    builder.addStep(
      buildExtractStep({
        modelUsed: ex.modelUsed,
        durationMs: Date.now() - extractStart,
        patientName: extracted.patient.fullName.value,
        specialty: extracted.serviceRequest.specialty.value,
        priority: extracted.serviceRequest.priority.value,
        missingFieldCount: extracted.missingFields.length,
        reviewFlagCount: reviewFlags.length,
      })
    );
  } catch (err) {
    builder.addStep(
      buildErrorStep({
        failingStage: "Extract",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      })
    );
    return {
      trace: builder.error(),
      extracted: null,
      eligibility: null,
      draft: null,
      reviewFlags: [],
      status: "failed",
    };
  }

  /* ---- 3. Eligibility ---- */
  const primaryCoverage = extracted.coverage[0];
  if (
    !primaryCoverage ||
    !primaryCoverage.payerName.value ||
    !primaryCoverage.memberId.value
  ) {
    builder.addStep(
      buildErrorStep({
        failingStage: "Eligibility",
        errorMessage:
          "Cannot run eligibility check: payer name or member ID missing from extraction.",
        durationMs: 0,
      })
    );
    return {
      trace: builder.error(),
      extracted,
      eligibility: null,
      draft: null,
      reviewFlags,
      status: "failed",
    };
  }

  try {
    const eligStart = Date.now();
    eligibility = await checkEligibility({
      payerName: primaryCoverage.payerName.value,
      memberId: primaryCoverage.memberId.value,
      planType: primaryCoverage.planType.value,
    });

    builder.addStep(
      buildEligibilityStep({
        payerName: eligibility.payerName,
        memberId: eligibility.memberId,
        isInNetwork: eligibility.isInNetwork,
        priorAuthRequired: eligibility.priorAuthRequired,
        warningCount: eligibility.warnings.length,
        mockTransactionId: eligibility.mockTransactionId,
        durationMs: Date.now() - eligStart,
      })
    );
  } catch (err) {
    builder.addStep(
      buildErrorStep({
        failingStage: "Eligibility",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      })
    );
    return {
      trace: builder.error(),
      extracted,
      eligibility: null,
      draft: null,
      reviewFlags,
      status: "failed",
    };
  }

  /* ---- 4. Draft outreach ---- */
  try {
    const draftStart = Date.now();
    const dr = await draftOutreach({ extracted, eligibility });
    draft = dr.draft;

    builder.addStep(
      buildOutreachStep({
        modelUsed: dr.modelUsed,
        durationMs: Date.now() - draftStart,
        channel: draft.channel,
        tone: draft.tone,
        bodyLength: draft.body.length,
        readingLevelGrade: draft.estimatedReadingLevelGrade,
      })
    );
  } catch (err) {
    builder.addStep(
      buildErrorStep({
        failingStage: "Draft",
        errorMessage: err instanceof Error ? err.message : String(err),
        durationMs: 0,
      })
    );
    return {
      trace: builder.error(),
      extracted,
      eligibility,
      draft: null,
      reviewFlags,
      status: "failed",
    };
  }

  /* ---- 5. Review flagging ---- */
  const flagStart = Date.now();
  builder.addStep(
    buildReviewFlagsStep({
      flagCount: reviewFlags.length,
      flagPaths: reviewFlags.map((f) => f.path),
      durationMs: Date.now() - flagStart,
    })
  );

  /* ---- Complete ---- */
  builder.addStep(buildCompleteStep(Date.now() - pipelineStart));

  return {
    trace: builder.complete(),
    extracted,
    eligibility,
    draft,
    reviewFlags,
    status: "complete",
  };
}