/**
 * Audit trace builder.
 *
 * Every run of the agent produces one AuditTrace — an append-only log of
 * every step the agent took, with timestamps, inputs, outputs, durations,
 * and metadata. The trace is the "receipt" the user sees and can export.
 *
 * Design decisions:
 *
 * 1. The trace is constructed by an Orchestrator (see ./orchestrator.ts)
 *    that wraps each pipeline stage. Step builders here are pure functions
 *    that produce typed AuditStep objects — no I/O, no side effects.
 *
 * 2. Summaries are short (≤ 200 chars). The full payloads from each stage
 *    are returned to the caller separately. This keeps the trace itself
 *    scannable in the UI, with deep-dive available on demand.
 *
 * 3. The trace is in-memory only, scoped to a single request. Persisting
 *    traces would be a Phase-11 (post-MVP) database concern.
 */

import { randomUUID } from "crypto";
import { AuditStep, AuditTrace } from "@/lib/schemas/pipeline";

/**
 * Fluent builder for an AuditTrace. Use addStep() to append, complete()
 * to seal the trace, error() to seal it as failed.
 */
export class TraceBuilder {
  private trace: AuditTrace;

  constructor() {
    this.trace = {
      traceId: randomUUID(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      steps: [],
    };
  }

  /**
   * Append a step. Step numbers are assigned automatically (1-indexed).
   */
  addStep(step: Omit<AuditStep, "stepNumber" | "timestamp">): AuditStep {
    const full: AuditStep = {
      ...step,
      stepNumber: this.trace.steps.length + 1,
      timestamp: new Date().toISOString(),
    };
    this.trace.steps.push(full);
    return full;
  }

  /**
   * Mark the trace as complete and return the sealed object.
   */
  complete(): AuditTrace {
    this.trace.completedAt = new Date().toISOString();
    return this.trace;
  }

  /**
   * Mark the trace as completed-with-error and return the sealed object.
   * The error step itself should be added via addStep() before calling this.
   */
  error(): AuditTrace {
    this.trace.completedAt = new Date().toISOString();
    return this.trace;
  }

  /**
   * Read-only snapshot of the current trace, useful for streaming progress
   * back to the caller before the run completes.
   */
  snapshot(): AuditTrace {
    return JSON.parse(JSON.stringify(this.trace));
  }
}

/* -------------------------------------------------------------------------- */
/*  Step builders — pure functions, one per stage                              */
/* -------------------------------------------------------------------------- */

export function buildIngestStep(
  rawTextLength: number,
  sourceFixtureId: string | undefined,
  durationMs: number
): Omit<AuditStep, "stepNumber" | "timestamp"> {
  return {
    stepName: "Ingest referral",
    stepType: "ingest",
    durationMs,
    inputSummary: sourceFixtureId
      ? `Loaded fixture ${sourceFixtureId} (${rawTextLength} chars)`
      : `Received ${rawTextLength} chars of unstructured text`,
    outputSummary: "Referral text accepted into pipeline",
    metadata: {
      rawTextLength,
      sourceFixtureId: sourceFixtureId ?? null,
    },
  };
}

export function buildExtractStep(args: {
  modelUsed: string;
  durationMs: number;
  patientName: string | null;
  specialty: string | null;
  priority: string | null;
  missingFieldCount: number;
  reviewFlagCount: number;
}): Omit<AuditStep, "stepNumber" | "timestamp"> {
  const { modelUsed, durationMs, patientName, specialty, priority, missingFieldCount, reviewFlagCount } = args;
  return {
    stepName: "LLM field extraction",
    stepType: "llm_extract",
    durationMs,
    inputSummary: `Prompt: extraction system prompt + raw referral text. Model: ${modelUsed}, temperature=0.1, response_format=json_object.`,
    outputSummary: `Extracted patient=${patientName ?? "?"}, specialty=${specialty ?? "?"}, priority=${priority ?? "?"}. ${missingFieldCount} fields missing, ${reviewFlagCount} fields flagged for review.`,
    metadata: {
      modelUsed,
      missingFieldCount,
      reviewFlagCount,
    },
  };
}

export function buildEligibilityStep(args: {
  payerName: string;
  memberId: string;
  isInNetwork: boolean;
  priorAuthRequired: boolean;
  warningCount: number;
  mockTransactionId: string;
  durationMs: number;
}): Omit<AuditStep, "stepNumber" | "timestamp"> {
  const { payerName, memberId, isInNetwork, priorAuthRequired, warningCount, mockTransactionId, durationMs } = args;
  // Mask all but last 4 of member ID in the trace — even on synthetic data
  // we model the production hygiene a real audit log would require.
  const maskedMemberId = memberId.length > 4
    ? `${"*".repeat(Math.max(0, memberId.length - 4))}${memberId.slice(-4)}`
    : memberId;
  return {
    stepName: "Payer eligibility check",
    stepType: "eligibility_check",
    durationMs,
    inputSummary: `X12 270 (mock) → payer="${payerName}", memberId=${maskedMemberId}`,
    outputSummary: `X12 271 (mock) → inNetwork=${isInNetwork}, priorAuth=${priorAuthRequired}, ${warningCount} warning(s). Transaction ${mockTransactionId}.`,
    metadata: {
      mockTransactionId,
      isInNetwork,
      priorAuthRequired,
      warningCount,
    },
  };
}

export function buildOutreachStep(args: {
  modelUsed: string;
  durationMs: number;
  channel: string;
  tone: string;
  bodyLength: number;
  readingLevelGrade: number | undefined;
}): Omit<AuditStep, "stepNumber" | "timestamp"> {
  const { modelUsed, durationMs, channel, tone, bodyLength, readingLevelGrade } = args;
  return {
    stepName: "LLM outreach drafting",
    stepType: "llm_draft_outreach",
    durationMs,
    inputSummary: `Prompt: outreach system prompt + compact extraction + eligibility. Model: ${modelUsed}, temperature=0.3, response_format=json_object.`,
    outputSummary: `Drafted ${channel} (${tone}), ${bodyLength} chars, reading level ${readingLevelGrade?.toFixed(1) ?? "?"}.`,
    metadata: {
      modelUsed,
      channel,
      tone,
      bodyLength,
      readingLevelGrade,
    },
  };
}

export function buildReviewFlagsStep(args: {
  flagCount: number;
  flagPaths: string[];
  durationMs: number;
}): Omit<AuditStep, "stepNumber" | "timestamp"> {
  const { flagCount, flagPaths, durationMs } = args;
  return {
    stepName: "Human review flagging",
    stepType: "review_flag",
    durationMs,
    inputSummary: `Walked extracted payload against confidence threshold (0.70).`,
    outputSummary: flagCount === 0
      ? "No fields flagged. Pipeline output is high-confidence."
      : `${flagCount} field(s) below threshold: ${flagPaths.slice(0, 5).join(", ")}${flagPaths.length > 5 ? "..." : ""}.`,
    metadata: {
      flagCount,
      flagPaths,
    },
  };
}

export function buildCompleteStep(totalDurationMs: number): Omit<AuditStep, "stepNumber" | "timestamp"> {
  return {
    stepName: "Pipeline complete",
    stepType: "complete",
    durationMs: 0,
    inputSummary: "All stages succeeded.",
    outputSummary: `Total pipeline duration: ${totalDurationMs}ms.`,
    metadata: {
      totalDurationMs,
    },
  };
}

export function buildErrorStep(args: {
  failingStage: string;
  errorMessage: string;
  durationMs: number;
}): Omit<AuditStep, "stepNumber" | "timestamp"> {
  return {
    stepName: `Error in ${args.failingStage}`,
    stepType: "error",
    durationMs: args.durationMs,
    inputSummary: `Stage "${args.failingStage}" raised an exception.`,
    outputSummary: args.errorMessage.slice(0, 280),
    metadata: {
      failingStage: args.failingStage,
      errorMessage: args.errorMessage,
    },
  };
}