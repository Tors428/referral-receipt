/**
 * EligibilityCard — renders the mock X12 271 (Eligibility Benefit Response)
 * as a clinical card.
 *
 * Sections:
 *   - Coverage status (active, in-network)
 *   - Cost-share (copay, coinsurance, deductible)
 *   - Prior authorization
 *   - Warnings
 *   - Metadata (mock transaction id, response time)
 */

"use client";

import { clsx } from "clsx";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/Badge";
import type { EligibilityResult } from "@/lib/schemas/pipeline";

type Props = {
  eligibility: EligibilityResult;
};

export function EligibilityCard({ eligibility }: Props) {
  const statusBadge = buildStatusBadge(eligibility);

  return (
    <SectionCard
      title="Payer eligibility"
      resourceType="271"
      badge={statusBadge}
    >
      {/* Coverage status row */}
      <Row label="Payer" value={eligibility.payerName} />
      <Row
        label="Member ID"
        value={maskMemberId(eligibility.memberId)}
        mono
      />
      <Row
        label="Coverage active"
        value={eligibility.isActive ? "Yes" : "No"}
        valueClass={eligibility.isActive ? "text-success" : "text-danger"}
      />
      <Row
        label="In network"
        value={eligibility.isInNetwork ? "Yes" : "No"}
        valueClass={eligibility.isInNetwork ? "text-success" : "text-danger"}
      />
      {(eligibility.coverageStartDate || eligibility.coverageEndDate) && (
        <Row
          label="Coverage period"
          value={`${eligibility.coverageStartDate ?? "?"} → ${
            eligibility.coverageEndDate ?? "?"
          }`}
          mono
        />
      )}

      {/* Cost-share */}
      <div className="pt-3 pb-1">
        <div className="text-[11px] font-mono text-muted uppercase tracking-wide">
          Cost-share
        </div>
      </div>
      <Row
        label="Copay"
        value={
          eligibility.copayUsd === null
            ? "—"
            : `$${eligibility.copayUsd.toFixed(2)}`
        }
        mono
      />
      <Row
        label="Coinsurance"
        value={
          eligibility.coinsuranceRate === null
            ? "—"
            : `${(eligibility.coinsuranceRate * 100).toFixed(0)}%`
        }
        mono
      />
      <Row
        label="Deductible remaining"
        value={
          eligibility.deductibleRemainingUsd === null
            ? "—"
            : `$${eligibility.deductibleRemainingUsd.toFixed(2)}`
        }
        mono
      />

      {/* Prior auth */}
      <div className="pt-3 pb-1">
        <div className="text-[11px] font-mono text-muted uppercase tracking-wide">
          Prior authorization
        </div>
      </div>
      <Row
        label="Required"
        value={eligibility.priorAuthRequired ? "Yes" : "No"}
        valueClass={
          eligibility.priorAuthRequired ? "text-warning" : "text-success"
        }
      />
      {eligibility.priorAuthNotes && (
        <div className="py-2 text-xs text-ink leading-relaxed border-b border-border last:border-0">
          <div className="text-[11px] font-mono text-muted mb-1">
            Notes
          </div>
          {eligibility.priorAuthNotes}
        </div>
      )}

      {/* Warnings */}
      {eligibility.warnings.length > 0 && (
        <div className="mt-3 bg-warning/5 border border-warning/30 rounded-md p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-semibold text-ink">
              {eligibility.warnings.length} warning
              {eligibility.warnings.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="text-xs text-ink space-y-1.5 leading-relaxed">
            {eligibility.warnings.map((w, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-warning shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata footer */}
      <div className="mt-3 pt-2 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted">
        <span className="inline-flex items-center gap-1">
          <Info className="w-2.5 h-2.5" />
          {eligibility.mockTransactionId}
        </span>
        <span>{eligibility.responseTimeMs} ms · mock clearinghouse</span>
      </div>
    </SectionCard>
  );
}

/* ---------- helpers ---------- */

function buildStatusBadge(elig: EligibilityResult): React.ReactNode {
  if (!elig.isActive) {
    return (
      <Badge variant="danger" className="gap-1">
        <ShieldAlert className="w-3 h-3" /> inactive
      </Badge>
    );
  }
  if (!elig.isInNetwork) {
    return (
      <Badge variant="warning" className="gap-1">
        <ShieldAlert className="w-3 h-3" /> out of network
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1">
      <ShieldCheck className="w-3 h-3" /> in network
    </Badge>
  );
}

/**
 * Mask all but the last 4 characters of the member ID, mirroring the
 * masking applied in the audit trace. Even on synthetic data this models
 * the production hygiene a real eligibility UI would require.
 */
function maskMemberId(id: string): string {
  if (id.length <= 4) return id;
  return "*".repeat(id.length - 4) + id.slice(-4);
}

function Row({
  label,
  value,
  mono = false,
  valueClass,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
      <span className="text-xs font-mono text-muted">{label}</span>
      <span
        className={clsx(
          "text-sm text-ink",
          mono && "font-mono",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
}