/**
 * Groq client wrapper.
 *
 * Centralizes model selection and API key access so we can swap models
 * (e.g. llama-3.3-70b → llama-3.1-405b) in one place. Also gives us a
 * single seam to inject retry / timeout logic later without touching
 * every call site.
 */

import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  throw new Error(
    "GROQ_API_KEY is missing. Add it to .env.local — see .env.example."
  );
}

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Model selection.
 *
 * llama-3.3-70b-versatile balances latency and structured-output quality
 * on Groq's free tier. For production we'd evaluate against a held-out
 * set of referrals with a tuned eval harness.
 */
export const EXTRACTION_MODEL = "llama-3.3-70b-versatile";
export const DRAFTING_MODEL = "llama-3.3-70b-versatile";