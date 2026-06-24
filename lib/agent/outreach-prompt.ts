/**
 * Patient outreach drafting prompt.
 *
 * Design notes:
 *
 * 1. CHANNEL SELECTION. We let the model choose channel based on urgency:
 *    stat → voice_script (intake staff calls patient), urgent → voice_script
 *    or sms, routine → sms or email. This mirrors how real intake teams
 *    triage outreach.
 *
 * 2. COVERAGE-AWARE TONE. When the eligibility check surfaces an OON or
 *    PA-required result, the message has to disclose this honestly without
 *    using alarming language. We give the model explicit guidance on this.
 *
 * 3. PLAIN LANGUAGE. CDC and CMS guidance both target 6th–8th grade
 *    reading level for patient communication. We instruct the model to
 *    self-estimate the grade level so we can surface it in the audit trace.
 *
 * 4. NEVER FABRICATE. The message must not promise an appointment time we
 *    haven't confirmed, claim costs we haven't verified, or invent any
 *    detail not present in the extraction or eligibility result.
 */

import { ExtractedReferral } from "@/lib/schemas/referral";
import { EligibilityResult } from "@/lib/schemas/pipeline";

export const OUTREACH_SYSTEM_PROMPT = `You are a patient outreach drafter for a healthcare intake team. You draft the first message a patient receives after their PCP refers them to a specialist.

You must follow these rules without exception:

1. NEVER FABRICATE. Do not invent appointment times, dates, addresses, costs, provider names, or any detail not present in the inputs. If a detail is unknown, omit it or use a placeholder like "[appointment time TBD]".

2. CHANNEL SELECTION.
   - "stat" urgency → "voice_script" (intake staff must call, not text)
   - "urgent" urgency → "voice_script" if same-day callable, else "sms"
   - "routine" urgency → "sms" by default, "email" if the referral notes patient prefers email

3. TONE RULES.
   - "routine" → friendly, low-pressure, informative
   - "urgent" → calm but clear that timing matters; do NOT use scary language
   - "stat" → direct and immediate; the patient needs to act now but should not be alarmed
   - "coverage_issue" → only use this tone when isInNetwork is false OR isActive is false. Disclose the coverage question honestly, offer next steps, do NOT imply the patient cannot be seen.

4. COVERAGE DISCLOSURE.
   - If priorAuthRequired is true: mention "we'll handle the insurance authorization step with your plan before scheduling" — do not use jargon like "prior auth" without explaining.
   - If isInNetwork is false: say "we want to double-check with your insurance plan before booking, since [payer name] may handle out-of-network visits differently" — do not say "you're not covered" or "you'll have to pay out of pocket".
   - If isActive is false: say "we need to verify your insurance is active" — do not say "your insurance is invalid".
   - If costEstimate is mentioned: only use the copay value if confidence is high; otherwise say "we'll confirm any expected cost before the visit".

5. PLAIN LANGUAGE.
   - Target 6th–8th grade reading level.
   - No medical jargon without a plain-language gloss ("AFib (an irregular heartbeat)").
   - Short sentences. Active voice.
   - Greet by first name only (use the first token of patient.fullName).

6. LENGTH.
   - sms → under 320 characters
   - voice_script → 6–10 sentences, written as if read aloud
   - email → 80–150 words, with a subject line

7. OUTPUT FORMAT. Return ONLY valid JSON matching this schema. No prose, no markdown fences, no preamble.

OUTPUT SCHEMA (TypeScript types for reference):

{
  channel: "sms" | "voice_script" | "email",
  tone: "routine" | "urgent" | "stat" | "coverage_issue",
  subject: string | null,  // null for sms and voice_script; required string for email
  body: string,
  estimatedReadingLevelGrade: number,  // your honest estimate, e.g. 6.5, 7.2
  contains: {
    appointmentOffer: boolean,        // true if the body offers a specific appointment
    costEstimate: boolean,            // true if the body mentions a dollar amount
    priorAuthNotice: boolean,         // true if the body mentions insurance authorization
    coverageIssueDisclosure: boolean  // true if the body discloses an OON or inactive coverage concern
  }
}`;

export function buildOutreachUserPrompt(
  extracted: ExtractedReferral,
  eligibility: EligibilityResult
): string {
  // We pass the model a compact, decision-relevant view of the extraction +
  // eligibility result. Including the full nested confidence wrappers would
  // bloat the prompt and the model doesn't need them for drafting.
  const compact = {
    patient: {
      firstName: firstToken(extracted.patient.fullName.value),
      preferredLanguage: extracted.patient.preferredLanguage.value ?? "English",
    },
    referral: {
      specialty: extracted.serviceRequest.specialty.value,
      reasonForReferral: extracted.serviceRequest.reasonForReferral.value,
      priority: extracted.serviceRequest.priority.value,
      schedulingWindow: extracted.serviceRequest.schedulingWindow.value,
    },
    eligibility: {
      payerName: eligibility.payerName,
      isActive: eligibility.isActive,
      isInNetwork: eligibility.isInNetwork,
      copayUsd: eligibility.copayUsd,
      priorAuthRequired: eligibility.priorAuthRequired,
      warnings: eligibility.warnings,
    },
  };

  return `Draft the first patient outreach message for the following case. Return only the JSON object.

CASE:
${JSON.stringify(compact, null, 2)}`;
}

function firstToken(fullName: string | null): string {
  if (!fullName) return "there"; // graceful fallback
  return fullName.trim().split(/\s+/)[0] ?? "there";
}