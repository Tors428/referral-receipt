/**
 * AuditTracePanel — the receipt itself.
 *
 * Renders the AuditTrace as a step-by-step timeline:
 *   - Each step shows number, name, type icon, duration, and a one-line summary
 *   - Click a step to expand and see input/output summaries + metadata
 *   - Top-right: "Download JSON" exports the full trace
 *
 * This is the artifact the project is named after. Every step the agent took
 * is here, with timestamps, durations, and masked PHI — exportable and
 * inspectable.
 */

"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  ChevronRight,
  Download,
  FileText,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Workflow,
  Mail,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/Badge";
import type { AuditStep, AuditTrace } from "@/lib/schemas/pipeline";

type Props = {
  trace: AuditTrace;
};

export function AuditTracePanel({ trace }: Props) {
  const totalDuration =
    trace.completedAt && trace.startedAt
      ? new Date(trace.completedAt).getTime() -
        new Date(trace.startedAt).getTime()
      : null;

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(trace, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referral-receipt-trace-${trace.traceId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <SectionCard
      title="Audit trace"
      resourceType="receipt"
      badge={
        <button
          onClick={handleDownload}
          className={clsx(
            "inline-flex items-center gap-1 text-[11px] font-mono",
            "text-ink border border-border bg-white hover:bg-canvas",
            "px-2 py-1 rounded-md transition-colors"
          )}
        >
          <Download className="w-3 h-3" />
          Download JSON
        </button>
      }
    >
      {/* Trace meta strip */}
      <div className="pt-2 pb-3 border-b border-border flex items-center justify-between text-[11px] font-mono">
        <span className="text-muted">
          <span className="text-ink">{trace.steps.length}</span> step
          {trace.steps.length === 1 ? "" : "s"}
          {totalDuration !== null && (
            <>
              {" · "}
              <span className="text-ink">{totalDuration.toLocaleString()}</span>{" "}
              ms total
            </>
          )}
        </span>
        <span className="text-muted">
          trace <span className="text-ink">{trace.traceId.slice(0, 8)}</span>
        </span>
      </div>

      {/* Steps timeline */}
      <ul className="pt-2">
        {trace.steps.map((step, i) => (
          <StepRow key={i} step={step} isLast={i === trace.steps.length - 1} />
        ))}
      </ul>
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step row                                                                   */
/* -------------------------------------------------------------------------- */

function StepRow({ step, isLast }: { step: AuditStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="relative">
      {/* Vertical connector line */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute left-[14px] top-7 bottom-0 w-px bg-border"
        />
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left flex items-start gap-3 py-2.5 hover:bg-canvas/60 rounded-md px-1 transition-colors"
      >
        {/* Type icon */}
        <div className="shrink-0 mt-0.5">
          <StepIcon type={step.stepType} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-muted">
              #{step.stepNumber}
            </span>
            <span className="text-sm font-semibold text-ink">
              {step.stepName}
            </span>
            <StepBadge type={step.stepType} />
            <span className="text-[10px] font-mono text-muted ml-auto">
              {step.durationMs.toLocaleString()} ms
            </span>
          </div>

          <div className="text-xs font-mono text-muted mt-1 leading-snug break-words">
            {step.outputSummary}
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-2 bg-canvas border border-border rounded-md p-2.5 space-y-2 text-[11px] font-mono">
              <DetailRow label="Timestamp" value={step.timestamp} />
              <DetailRow label="Input" value={step.inputSummary} />
              <DetailRow label="Output" value={step.outputSummary} />
              {step.metadata && Object.keys(step.metadata).length > 0 && (
                <div>
                  <div className="text-muted mb-1">Metadata</div>
                  <pre className="text-ink bg-white border border-border rounded p-2 overflow-x-auto leading-snug">
                    {JSON.stringify(step.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Caret */}
        <ChevronRight
          className={clsx(
            "w-3.5 h-3.5 text-muted shrink-0 mt-1 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type StepIconEntry = {
  Icon: typeof FileText;
  bg: string;
  fg: string;
};

function StepIcon({ type }: { type: AuditStep["stepType"] }) {
  const map: Record<AuditStep["stepType"], StepIconEntry> = {
    ingest: { Icon: FileText, bg: "bg-canvas", fg: "text-muted" },
    llm_extract: { Icon: Cpu, bg: "bg-accent/10", fg: "text-accent" },
    eligibility_check: {
      Icon: ShieldCheck,
      bg: "bg-accent/10",
      fg: "text-accent",
    },
    llm_draft_outreach: { Icon: Mail, bg: "bg-accent/10", fg: "text-accent" },
    review_flag: { Icon: AlertTriangle, bg: "bg-warning/10", fg: "text-warning" },
    complete: { Icon: CheckCircle2, bg: "bg-success/10", fg: "text-success" },
    error: { Icon: AlertTriangle, bg: "bg-danger/10", fg: "text-danger" },
  };
  const { Icon, bg, fg } = map[type] ?? {
    Icon: Workflow,
    bg: "bg-canvas",
    fg: "text-muted",
  };
  return (
    <div
      className={clsx(
        "w-7 h-7 rounded-md border border-border flex items-center justify-center",
        bg
      )}
    >
      <Icon className={clsx("w-3.5 h-3.5", fg)} />
    </div>
  );
}

function StepBadge({ type }: { type: AuditStep["stepType"] }) {
  if (type === "error") return <Badge variant="danger">error</Badge>;
  if (type === "complete") return <Badge variant="success">complete</Badge>;
  if (type === "review_flag") return <Badge variant="warning">review</Badge>;
  return null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted mb-0.5">{label}</div>
      <div className="text-ink break-words leading-snug">{value}</div>
    </div>
  );
}