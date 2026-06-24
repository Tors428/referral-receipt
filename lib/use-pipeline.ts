/**
 * Client-side hook for running the referral pipeline.
 *
 * Wraps POST /api/run and exposes a typed state machine:
 *   idle → running → complete | failed
 *
 * Consumers call run(rawText, sourceFixtureId) and observe `state` to
 * render loading, success, and error UIs.
 */

"use client";

import { useState, useCallback } from "react";
import type {
  ExtractedReferral,
} from "@/lib/schemas/referral";
import type {
  EligibilityResult,
  OutreachDraft,
  AuditTrace,
} from "@/lib/schemas/pipeline";

export type ReviewFlag = {
  path: string;
  confidence: number;
  reason: string;
};

export type PipelineResult = {
  status: "complete" | "failed";
  trace: AuditTrace;
  extracted: ExtractedReferral | null;
  eligibility: EligibilityResult | null;
  draft: OutreachDraft | null;
  reviewFlags: ReviewFlag[];
};

export type PipelineState =
  | { status: "idle" }
  | { status: "running"; startedAt: number }
  | { status: "complete"; result: PipelineResult; durationMs: number }
  | { status: "failed"; error: string; partialResult?: PipelineResult };

export function usePipeline() {
  const [state, setState] = useState<PipelineState>({ status: "idle" });

  const run = useCallback(
    async (rawText: string, sourceFixtureId?: string) => {
      const startedAt = Date.now();
      setState({ status: "running", startedAt });

      try {
        const res = await fetch("/api/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText, sourceFixtureId }),
        });

        if (!res.ok) {
          // Try to surface server-side error message
          let message = `Pipeline failed with HTTP ${res.status}`;
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody.error) message = errBody.error;
          } catch {
            // body not JSON — keep generic message
          }
          setState({ status: "failed", error: message });
          return;
        }

        const result = (await res.json()) as PipelineResult;
        const durationMs = Date.now() - startedAt;

        if (result.status === "failed") {
          setState({
            status: "failed",
            error: "Pipeline returned status=failed. See partial trace.",
            partialResult: result,
          });
          return;
        }

        setState({ status: "complete", result, durationMs });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown network error";
        setState({ status: "failed", error: message });
      }
    },
    []
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, run, reset };
}