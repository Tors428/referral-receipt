/**
 * ExtractionCard — the heart of the receipt UI.
 *
 * Renders the ExtractedReferral as four FHIR-shaped sections (Patient,
 * Practitioner, Coverage, ServiceRequest), each field showing its
 * confidence pill and review badge when needed.
 *
 * The top strip shows a quick summary: missing-field count, low-confidence
 * count, and priority chip.
 */

"use client";

import { clsx } from "clsx";
import { AlertTriangle } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { ConfidenceField } from "@/components/ui/ConfidenceField";
import type { ExtractedReferral } from "@/lib/schemas/referral";
import type { ReviewFlag } from "@/lib/use-pipeline";

type Props = {
  extracted: ExtractedReferral;
  reviewFlags: ReviewFlag[];
};

export function ExtractionCard({ extracted, reviewFlags }: Props) {
  const priority = extracted.serviceRequest.priority.value ?? "unknown";

  return (
    <div className="flex flex-col gap-3">
      {/* Top summary strip */}
      <div className="bg-canvas border border-border rounded-md px-3 py-2 flex items-center justify-between text-xs font-mono">
        <span className="text-muted">
          {extracted.missingFields.length} field
          {extracted.missingFields.length === 1 ? "" : "s"} missing ·{" "}
          {reviewFlags.length} flagged for review
        </span>
        <PriorityChip priority={priority} />
      </div>

      {/* Patient */}
      <SectionCard title="Patient" resourceType="Patient">
        <ConfidenceField
          label="Full name"
          value={extracted.patient.fullName.value}
          confidence={extracted.patient.fullName.confidence}
          reasoning={extracted.patient.fullName.reasoning}
        />
        <ConfidenceField
          label="Date of birth"
          value={extracted.patient.dateOfBirth.value}
          confidence={extracted.patient.dateOfBirth.confidence}
          reasoning={extracted.patient.dateOfBirth.reasoning}
          mono
        />
        <ConfidenceField
          label="Sex"
          value={extracted.patient.sex.value}
          confidence={extracted.patient.sex.confidence}
          reasoning={extracted.patient.sex.reasoning}
        />
        <ConfidenceField
          label="Phone"
          value={extracted.patient.phone.value}
          confidence={extracted.patient.phone.confidence}
          reasoning={extracted.patient.phone.reasoning}
          mono
        />
        <ConfidenceField
          label="MRN"
          value={extracted.patient.mrn.value}
          confidence={extracted.patient.mrn.confidence}
          reasoning={extracted.patient.mrn.reasoning}
          mono
        />
        <ConfidenceField
          label="Preferred language"
          value={extracted.patient.preferredLanguage.value}
          confidence={extracted.patient.preferredLanguage.confidence}
          reasoning={extracted.patient.preferredLanguage.reasoning}
        />
      </SectionCard>

      {/* Referring provider */}
      <SectionCard title="Referring provider" resourceType="Practitioner">
        <ConfidenceField
          label="Full name"
          value={extracted.referringProvider.fullName.value}
          confidence={extracted.referringProvider.fullName.confidence}
          reasoning={extracted.referringProvider.fullName.reasoning}
        />
        <ConfidenceField
          label="Credentials"
          value={extracted.referringProvider.credentials.value}
          confidence={extracted.referringProvider.credentials.confidence}
          reasoning={extracted.referringProvider.credentials.reasoning}
          mono
        />
        <ConfidenceField
          label="NPI"
          value={extracted.referringProvider.npi.value}
          confidence={extracted.referringProvider.npi.confidence}
          reasoning={extracted.referringProvider.npi.reasoning}
          mono
        />
        <ConfidenceField
          label="Facility"
          value={extracted.referringProvider.facility.value}
          confidence={extracted.referringProvider.facility.confidence}
          reasoning={extracted.referringProvider.facility.reasoning}
        />
      </SectionCard>

      {/* Coverage(s) */}
      {extracted.coverage.map((cov, i) => (
        <SectionCard
          key={i}
          title={
            extracted.coverage.length > 1
              ? `Coverage ${i + 1}${cov.isPrimary ? " (primary)" : " (secondary)"}`
              : "Coverage"
          }
          resourceType="Coverage"
        >
          <ConfidenceField
            label="Payer"
            value={cov.payerName.value}
            confidence={cov.payerName.confidence}
            reasoning={cov.payerName.reasoning}
          />
          <ConfidenceField
            label="Member ID"
            value={cov.memberId.value}
            confidence={cov.memberId.confidence}
            reasoning={cov.memberId.reasoning}
            mono
          />
          <ConfidenceField
            label="Group number"
            value={cov.groupNumber.value}
            confidence={cov.groupNumber.confidence}
            reasoning={cov.groupNumber.reasoning}
            mono
          />
          <ConfidenceField
            label="Plan type"
            value={cov.planType.value}
            confidence={cov.planType.confidence}
            reasoning={cov.planType.reasoning}
            mono
          />
        </SectionCard>
      ))}

      {/* Service request */}
      <SectionCard title="Service request" resourceType="ServiceRequest">
        <ConfidenceField
          label="Specialty"
          value={extracted.serviceRequest.specialty.value}
          confidence={extracted.serviceRequest.specialty.confidence}
          reasoning={extracted.serviceRequest.specialty.reasoning}
        />
        <ConfidenceField
          label="Reason for referral"
          value={extracted.serviceRequest.reasonForReferral.value}
          confidence={extracted.serviceRequest.reasonForReferral.confidence}
          reasoning={extracted.serviceRequest.reasonForReferral.reasoning}
        />
        <ConfidenceField
          label="Priority"
          value={extracted.serviceRequest.priority.value}
          confidence={extracted.serviceRequest.priority.confidence}
          reasoning={extracted.serviceRequest.priority.reasoning}
          mono
        />
        <ConfidenceField
          label="Scheduling window"
          value={extracted.serviceRequest.schedulingWindow.value}
          confidence={extracted.serviceRequest.schedulingWindow.confidence}
          reasoning={extracted.serviceRequest.schedulingWindow.reasoning}
        />

        {/* ICD-10 codes */}
        {extracted.serviceRequest.icd10Codes.length > 0 && (
          <div className="py-2 border-b border-border last:border-0">
            <div className="text-[11px] font-mono text-muted mb-1">
              ICD-10 codes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {extracted.serviceRequest.icd10Codes.map((c, i) => (
                <span
                  key={i}
                  className="text-xs font-mono text-ink bg-canvas border border-border rounded px-2 py-0.5"
                >
                  {c.code}
                  {c.description && (
                    <span className="text-muted ml-1">· {c.description}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CPT codes */}
        {extracted.serviceRequest.cptCodes.length > 0 && (
          <div className="py-2">
            <div className="text-[11px] font-mono text-muted mb-1">
              CPT codes
            </div>
            <div className="flex flex-wrap gap-1.5">
              {extracted.serviceRequest.cptCodes.map((c, i) => (
                <span
                  key={i}
                  className="text-xs font-mono text-ink bg-canvas border border-border rounded px-2 py-0.5"
                >
                  {c.code}
                  {c.description && (
                    <span className="text-muted ml-1">· {c.description}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Review flags summary (compact, not the full Phase 8.7 trace panel) */}
      {reviewFlags.length > 0 && (
        <div className="bg-warning/5 border border-warning/30 rounded-md p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            <span className="text-xs font-semibold text-ink">
              {reviewFlags.length} field
              {reviewFlags.length === 1 ? "" : "s"} flagged for human review
            </span>
          </div>
          <ul className="text-[11px] font-mono text-muted space-y-0.5">
            {reviewFlags.map((f, i) => (
              <li key={i} className="leading-tight">
                <span className="text-ink">{f.path}</span> — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function PriorityChip({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    routine: "text-muted bg-canvas border-border",
    urgent: "text-warning bg-warning/10 border-warning/30",
    stat: "text-danger bg-danger/10 border-danger/30",
    unknown: "text-muted bg-canvas border-border",
  };
  return (
    <span
      className={clsx(
        "uppercase tracking-wide text-[10px] font-mono px-2 py-0.5 rounded border",
        styles[priority] ?? styles.unknown
      )}
    >
      {priority}
    </span>
  );
}