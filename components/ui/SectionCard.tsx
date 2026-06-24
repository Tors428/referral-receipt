/**
 * SectionCard — clinical card with a header bar showing a FHIR resource
 * name + optional badge. Used to wrap each resource block in the
 * extraction view.
 */

"use client";

import { clsx } from "clsx";

type Props = {
  title: string;
  resourceType?: string; // FHIR resourceType label, shown in mono
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({
  title,
  resourceType,
  badge,
  children,
  className,
}: Props) {
  return (
    <div
      className={clsx(
        "bg-white border border-border rounded-lg shadow-clinical",
        className
      )}
    >
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-ink">{title}</h3>
          {resourceType && (
            <span className="text-[10px] font-mono text-muted">
              FHIR.{resourceType}
            </span>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}