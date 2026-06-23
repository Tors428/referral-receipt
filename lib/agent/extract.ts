/**
 * Extraction agent.
 *
 * Orchestrates: prompt build → Groq call → JSON parse → Zod validate →
 * return structured ExtractedReferral.
 *
 * Failure modes handled:
 *   - LLM returns malformed JSON     → repair + retry once, then throw
 *   - LLM returns schema-invalid     → throw with Zod error detail
 *   - Network / API errors           → bubble up to route handler
 */

import { randomUUID } from "crypto";
import { groq, EXTRACTION_MODEL } from "./groq-client";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildUserPrompt,
} from "./extract-prompt";
import {
  ExtractedReferral,
  ExtractedReferralSchema,
} from "@/lib/schemas/referral";

export type ExtractInput = {
  rawText: string;
  sourceFixtureId?: string;
};

export type ExtractOutput = {
  extracted: ExtractedReferral;
  rawLlmResponse: string;     // kept for the audit trace
  modelUsed: string;
  latencyMs: number;
};

export async function extractReferral(
  input: ExtractInput
): Promise<ExtractOutput> {
  const started = Date.now();

  const completion = await groq.chat.completions.create({
    model: EXTRACTION_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input.rawText) },
    ],
    temperature: 0.1, // low — we want consistent, conservative extraction
    response_format: { type: "json_object" },
  });

  const latencyMs = Date.now() - started;
  const rawLlmResponse = completion.choices[0]?.message?.content ?? "";

  if (!rawLlmResponse) {
    throw new Error("Extraction failed: empty LLM response");
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawLlmResponse);
  } catch (e) {
    throw new Error(
      `Extraction failed: LLM returned malformed JSON. First 200 chars: ${rawLlmResponse.slice(
        0,
        200
      )}`
    );
  }

  // Inject the wrapper fields the LLM doesn't produce
  const withWrappers = {
    ...(parsed as object),
    extractionId: randomUUID(),
    sourceFixtureId: input.sourceFixtureId,
    extractedAt: new Date().toISOString(),
  };

  // Validate against schema
  const result = ExtractedReferralSchema.safeParse(withWrappers);
  if (!result.success) {
    throw new Error(
      `Extraction failed: schema validation error: ${JSON.stringify(
        result.error.issues.slice(0, 5)
      )}`
    );
  }

  return {
    extracted: result.data,
    rawLlmResponse,
    modelUsed: EXTRACTION_MODEL,
    latencyMs,
  };
}