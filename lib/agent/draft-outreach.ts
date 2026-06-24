/**
 * Outreach drafting agent.
 *
 * Orchestrates: prompt build → Groq call → JSON parse → Zod validate →
 * return validated OutreachDraft.
 */

import { groq, DRAFTING_MODEL } from "./groq-client";
import {
  OUTREACH_SYSTEM_PROMPT,
  buildOutreachUserPrompt,
} from "./outreach-prompt";
import { ExtractedReferral } from "@/lib/schemas/referral";
import {
  EligibilityResult,
  OutreachDraft,
  OutreachDraftSchema,
} from "@/lib/schemas/pipeline";

export type DraftInput = {
  extracted: ExtractedReferral;
  eligibility: EligibilityResult;
};

export type DraftOutput = {
  draft: OutreachDraft;
  rawLlmResponse: string;
  modelUsed: string;
  latencyMs: number;
};

export async function draftOutreach(
  input: DraftInput
): Promise<DraftOutput> {
  const started = Date.now();

  const completion = await groq.chat.completions.create({
    model: DRAFTING_MODEL,
    messages: [
      { role: "system", content: OUTREACH_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildOutreachUserPrompt(input.extracted, input.eligibility),
      },
    ],
    temperature: 0.3, // slightly higher than extraction — small tonal variety is fine
    response_format: { type: "json_object" },
  });

  const latencyMs = Date.now() - started;
  const rawLlmResponse = completion.choices[0]?.message?.content ?? "";

  if (!rawLlmResponse) {
    throw new Error("Outreach drafting failed: empty LLM response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawLlmResponse);
  } catch {
    throw new Error(
      `Outreach drafting failed: LLM returned malformed JSON. First 200 chars: ${rawLlmResponse.slice(
        0,
        200
      )}`
    );
  }

  const result = OutreachDraftSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Outreach drafting failed: schema validation error: ${JSON.stringify(
        result.error.issues.slice(0, 5)
      )}`
    );
  }

  return {
    draft: result.data,
    rawLlmResponse,
    modelUsed: DRAFTING_MODEL,
    latencyMs,
  };
}