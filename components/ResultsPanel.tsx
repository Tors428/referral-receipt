/**
 * ResultsPanel — renders one of four states depending on the pipeline:
 *   idle      → empty placeholder
 *   running   → loading skeleton
 *   complete  → minimal success summary (full UI in 8.4–8.7)
 *   failed    → error card with optional partial trace
 *
 * This is a temporary scaffold. Real per-section cards arrive in 8.4–8.7.
 */

"use client";

import { Play, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ExtractionCard } from "@/components/ExtractionCard";
import { EligibilityCard } from "@/components/EligibilityCard";
import type { PipelineState } from "@/lib/use-pipeline";

export function ResultsPanel({ state }: { state: PipelineState }) {
  if (state.status === "idle") return <IdleView />;
  if (state.status === "running") return <RunningView />;
  if (state.status === "failed") return <FailedView state={state} />;
  return <CompleteView state={state} />;
}

/* ---------- Idle ---------- */
function IdleView() {
  return (
    <div className="bg-white border border-border rounded-lg shadow-clinical min-h-[420px] flex items-center justify-center">
      <div className="flex flex-col items-center text-center max-w-sm px-6 py-12">
        <div className="w-10 h-10 rounded-md bg-canvas border border-border flex items-center justify-center mb-3">
          <Play className="w-4 h-4 text-muted" />
        </div>
        <h3 className="font-semibold text-sm text-ink mb-1">
          Receipt will appear here
        </h3>
        <p className="text-xs text-muted leading-relaxed font-mono">
          Run the pipeline to see the extracted referral, payer eligibility
          result, drafted outreach, and the full audit trace.
        </p>
      </div>
    </div>
  );
}

/* ---------- Running ---------- */
function RunningView() {
  const stages = [
    "Ingesting referral",
    "Extracting fields with LLM",
    "Checking payer eligibility",
    "Drafting patient outreach",
    "Flagging fields for review",
  ];

  return (
    <div className="bg-white border border-border rounded-lg shadow-clinical min-h-[420px] p-6">
      <div className="flex items-center gap-2 mb-5">
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
        <h3 className="font-semibold text-sm text-ink">Pipeline running</h3>
        <Badge variant="accent" className="ml-auto">live</Badge>
      </div>

      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li
            key={s}
            className="flex items-center gap-2 text-xs font-mono text-muted"
          >
            <span className="w-4 h-4 rounded-full border border-border flex items-center justify-center text-[10px]">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ul>

      <p className="text-[11px] font-mono text-muted mt-6">
        Typical end-to-end latency: 2–4 seconds.
      </p>
    </div>
  );
}

/* ---------- Failed ---------- */
function FailedView({
  state,
}: {
  state: Extract<PipelineState, { status: "failed" }>;
}) {
  return (
    <div className="bg-white border border-danger/30 rounded-lg shadow-clinical min-h-[420px] p-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-danger" />
        <h3 className="font-semibold text-sm text-ink">Pipeline failed</h3>
        <Badge variant="danger" className="ml-auto">error</Badge>
      </div>
      <div className="bg-danger/5 border border-danger/20 rounded-md p-3 text-xs font-mono text-ink leading-relaxed">
        {state.error}
      </div>

      {state.partialResult && (
        <div className="mt-4 text-[11px] font-mono text-muted">
          Partial trace: {state.partialResult.trace.steps.length} step
          {state.partialResult.trace.steps.length === 1 ? "" : "s"} completed
          before failure.
        </div>
      )}
    </div>
  );
}

/* ---------- Complete (minimal — full UI in 8.4–8.7) ---------- */
function CompleteView({
  state,
}: {
  state: Extract<PipelineState, { status: "complete" }>;
}) {
  const { result, durationMs } = state;

  return (
    <div className="flex flex-col gap-3">
      {/* Status header — sits above the cards */}
      <div className="bg-white border border-border rounded-lg shadow-clinical px-4 py-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <h3 className="font-semibold text-sm text-ink">Pipeline complete</h3>
        <Badge variant="success" className="ml-auto">
          {durationMs.toLocaleString()} ms
        </Badge>
        <Badge variant="neutral">
          {result.trace.steps.length} step{result.trace.steps.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Extraction */}
      {/* Extraction */}
      {result.extracted && (
        <ExtractionCard
          extracted={result.extracted}
          reviewFlags={result.reviewFlags}
        />
      )}

      {/* Eligibility */}
      {result.eligibility && (
        <EligibilityCard eligibility={result.eligibility} />
      )}

      {/* Placeholder for outreach (8.6), audit trace (8.7) */}
      <div className="bg-canvas border border-dashed border-border rounded-md p-3 text-[11px] font-mono text-muted text-center">
        Outreach · audit trace cards arrive in steps 8.6 – 8.7.
      </div>
    </div>
  );
}


