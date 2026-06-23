/**
 * Pipeline schemas — eligibility check + outreach draft + audit trace.
 *
 * These describe what the downstream stages of the agent produce, after
 * extraction (defined in ./referral.ts).
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Eligibility check result                                                   */
/* -------------------------------------------------------------------------- */
/**
 * Mirrors the shape of a real X12 271 (Eligibility Benefit Response)
 * collapsed to the fields the scheduling flow actually uses.
 *
 * In production: this would come from a real clearinghouse (Availity,
 * Change Healthcare) or direct payer API. Here it's a mock.
 */
export const EligibilityResultSchema = z.object({
  // Echo of the request, for the audit trace
  payerName: z.string(),
  memberId: z.string(),

  // Coverage status
  isActive: z.boolean(),
  isInNetwork: z.boolean(),
  coverageStartDate: z.string().nullable(),
  coverageEndDate: z.string().nullable(),

  // Cost-share
  copayUsd: z.number().nullable(),
  coinsuranceRate: z.number().nullable(),      // 0–1 (e.g. 0.20 = 20%)
  deductibleRemainingUsd: z.number().nullable(),

  // Authorization
  priorAuthRequired: z.boolean(),
  priorAuthNotes: z.string().nullable(),

  // Soft signals
  warnings: z.array(z.string()),               // e.g. "Out-of-state plan"

  // Mock telemetry — makes the audit trace feel real
  mockTransactionId: z.string(),               // pseudo X12 270/271 ID
  responseTimeMs: z.number(),
});
export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;

/* -------------------------------------------------------------------------- */
/*  Outreach draft                                                             */
/* -------------------------------------------------------------------------- */
/**
 * The patient-facing message the agent drafts after eligibility resolves.
 * Channel + tone vary by urgency and coverage outcome.
 */
export const OutreachDraftSchema = z.object({
  channel: z.enum(["sms", "voice_script", "email"]),
  tone: z.enum(["routine", "urgent", "stat", "coverage_issue"]),
  subject: z.string().nullable(),              // null for sms / voice
  body: z.string(),
  estimatedReadingLevelGrade: z.number().optional(),  // plain-language target
  contains: z.object({
    appointmentOffer: z.boolean(),
    costEstimate: z.boolean(),
    priorAuthNotice: z.boolean(),
    coverageIssueDisclosure: z.boolean(),
  }),
});
export type OutreachDraft = z.infer<typeof OutreachDraftSchema>;

/* -------------------------------------------------------------------------- */
/*  Audit trace step                                                           */
/* -------------------------------------------------------------------------- */
/**
 * One step in the agent's audit trace. Every API call, LLM invocation,
 * and decision point appends one of these. The whole trace is exportable
 * as JSON from the UI.
 */
export const AuditStepSchema = z.object({
  stepNumber: z.number(),
  timestamp: z.string(),                       // ISO
  stepName: z.string(),                        // human-readable
  stepType: z.enum([
    "ingest",
    "llm_extract",
    "eligibility_check",
    "llm_draft_outreach",
    "review_flag",
    "complete",
    "error",
  ]),
  durationMs: z.number(),
  inputSummary: z.string(),                    // short, not full payload
  outputSummary: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AuditStep = z.infer<typeof AuditStepSchema>;

export const AuditTraceSchema = z.object({
  traceId: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  steps: z.array(AuditStepSchema),
});
export type AuditTrace = z.infer<typeof AuditTraceSchema>;