/**
 * ConfidenceField — renders one extracted field with its value, a confidence
 * pill, and a review badge if the field falls below the human-review threshold.
 *
 * Shape:
 *
 *   Label                                Value     [conf · 0.95] [Review?]
 *
 * Used inside the extraction card to show Patient / Practitioner / Coverage /
 * ServiceRequest fields uniformly.
 */

"use client";

import { clsx } from "clsx";
import { AlertCircle } from "lucide-react";
import { HUMAN_REVIEW_THRESHOLD } from "@/lib/schemas/referral";

type Props = {
  label: string;
  value: string | null;
  confidence: number;
  reasoning?: string;
  mono?: boolean;
};

export function ConfidenceField({
  label,
  value,
  confidence,
  reasoning,
  mono = false,
}: Props) {
  const needsReview = value === null || confidence < HUMAN_REVIEW_THRESHOLD;
  const isMissing = value === null;

  // Confidence pill color tier
  const tier =
    confidence >= 0.9
      ? "high"
      : confidence >= HUMAN_REVIEW_THRESHOLD
      ? "med"
      : "low";

  const tierStyles: Record<typeof tier, string> = {
    high: "text-success bg-success/10 border-success/30",
    med: "text-accent bg-accent/10 border-accent/30",
    low: "text-warning bg-warning/10 border-warning/30",
  };

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-mono text-muted">{label}</div>
        <div
          className={clsx(
            "text-sm mt-0.5 break-words",
            isMissing ? "text-muted italic" : "text-ink",
            mono && !isMissing && "font-mono"
          )}
          title={reasoning}
        >
          {isMissing ? "— not found —" : value}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
        <span
          className={clsx(
            "text-[10px] font-mono px-1.5 py-0.5 rounded border",
            tierStyles[tier]
          )}
          title={reasoning}
        >
          conf {confidence.toFixed(2)}
        </span>
        {needsReview && (
          <span className="text-[10px] font-mono text-warning bg-warning/10 border border-warning/30 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            review
          </span>
        )}
      </div>
    </div>
  );
}