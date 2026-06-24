/**
 * OutreachCard — renders the patient-facing outreach draft.
 *
 * The body is shown in a channel-appropriate frame:
 *   - sms          → phone-style message bubble
 *   - voice_script → call-script sheet with monospace
 *   - email        → email preview with subject row
 *
 * Below the frame: metadata grid showing tone, reading level, length, and
 * the content flags (which disclosures the draft contains).
 */

"use client";

import { clsx } from "clsx";
import {
  MessageSquare,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Badge } from "@/components/ui/Badge";
import type { OutreachDraft } from "@/lib/schemas/pipeline";

type Props = {
  draft: OutreachDraft;
  patientFirstName?: string;
};

export function OutreachCard({ draft, patientFirstName }: Props) {
  return (
    <SectionCard
      title="Patient outreach (draft)"
      resourceType="Communication"
      badge={<ToneBadge tone={draft.tone} />}
    >
      {/* Channel header */}
      <div className="flex items-center gap-2 pt-2 pb-3">
        <ChannelIcon channel={draft.channel} />
        <span className="text-xs font-mono text-muted uppercase tracking-wide">
          {channelLabel(draft.channel)}
        </span>
        {patientFirstName && (
          <span className="text-[11px] font-mono text-muted ml-auto">
            to: {patientFirstName}
          </span>
        )}
      </div>

      {/* Channel-specific body frame */}
      {draft.channel === "sms" && <SmsFrame body={draft.body} />}
      {draft.channel === "voice_script" && (
        <VoiceFrame body={draft.body} />
      )}
      {draft.channel === "email" && (
        <EmailFrame subject={draft.subject} body={draft.body} />
      )}

      {/* Metadata grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-mono">
        <MetaRow
          label="Length"
          value={`${draft.body.length.toLocaleString()} chars`}
        />
        <MetaRow
          label="Reading level"
          value={
            draft.estimatedReadingLevelGrade !== undefined
              ? `Grade ${draft.estimatedReadingLevelGrade.toFixed(1)}`
              : "—"
          }
        />
      </div>

      {/* Content flags */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="text-[11px] font-mono text-muted uppercase tracking-wide mb-2">
          Disclosures
        </div>
        <ul className="space-y-1.5">
          <FlagRow
            label="Appointment offer"
            value={draft.contains.appointmentOffer}
          />
          <FlagRow
            label="Cost estimate"
            value={draft.contains.costEstimate}
          />
          <FlagRow
            label="Prior-auth notice"
            value={draft.contains.priorAuthNotice}
          />
          <FlagRow
            label="Coverage-issue disclosure"
            value={draft.contains.coverageIssueDisclosure}
          />
        </ul>
      </div>
    </SectionCard>
  );
}

/* -------------------------------------------------------------------------- */
/*  Channel-specific frames                                                    */
/* -------------------------------------------------------------------------- */

function SmsFrame({ body }: { body: string }) {
  // iMessage-style green bubble, left-aligned (incoming from the clinic).
  return (
    <div className="bg-canvas border border-border rounded-lg p-4">
      <div className="max-w-[80%]">
        <div className="bg-accent text-white rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-snug whitespace-pre-wrap break-words shadow-sm">
          {body}
        </div>
        <div className="text-[10px] font-mono text-muted mt-1 ml-2">
          from the clinic · just now
        </div>
      </div>
    </div>
  );
}

function VoiceFrame({ body }: { body: string }) {
  return (
    <div className="bg-canvas border border-border rounded-lg p-4">
      <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-2">
        Call script · read aloud
      </div>
      <div className="text-sm font-mono text-ink whitespace-pre-wrap leading-relaxed">
        {body}
      </div>
    </div>
  );
}

function EmailFrame({
  subject,
  body,
}: {
  subject: string | null;
  body: string;
}) {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden">
      <div className="border-b border-border bg-canvas px-3 py-2">
        <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
          Subject
        </div>
        <div className="text-sm font-semibold text-ink mt-0.5">
          {subject ?? "(no subject)"}
        </div>
      </div>
      <div className="px-3 py-3 text-sm text-ink whitespace-pre-wrap leading-relaxed">
        {body}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function ToneBadge({ tone }: { tone: OutreachDraft["tone"] }) {
  const styles: Record<OutreachDraft["tone"], "neutral" | "warning" | "danger" | "accent"> = {
    routine: "neutral",
    urgent: "warning",
    stat: "danger",
    coverage_issue: "accent",
  };
  const label = tone === "coverage_issue" ? "coverage issue" : tone;
  return <Badge variant={styles[tone]}>{label}</Badge>;
}

function ChannelIcon({ channel }: { channel: OutreachDraft["channel"] }) {
  const Icon =
    channel === "sms"
      ? MessageSquare
      : channel === "voice_script"
      ? Phone
      : Mail;
  return <Icon className="w-3.5 h-3.5 text-muted" />;
}

function channelLabel(channel: OutreachDraft["channel"]): string {
  if (channel === "sms") return "SMS message";
  if (channel === "voice_script") return "Voice call script";
  return "Email";
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-canvas border border-border rounded px-2 py-1.5">
      <span className="text-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function FlagRow({ label, value }: { label: string; value: boolean }) {
  return (
    <li
      className={clsx(
        "flex items-center gap-2 text-xs",
        value ? "text-ink" : "text-muted"
      )}
    >
      {value ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-muted/60 shrink-0" />
      )}
      {label}
    </li>
  );
}