/**
 * SampleDropdown — lists all synthetic referral fixtures and lets the user
 * load one into the textarea. Each item shows the fixture's source format
 * and urgency hint so the user understands which test case they're loading.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText, Check } from "lucide-react";
import { clsx } from "clsx";
import { REFERRAL_FIXTURES, ReferralFixture } from "@/lib/fixtures/referrals";

type Props = {
  selectedId: string | undefined;
  onSelect: (fixture: ReferralFixture) => void;
};

export function SampleDropdown({ selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = REFERRAL_FIXTURES.find((f) => f.id === selectedId);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1.5 border border-border bg-white",
          "hover:bg-canvas px-2.5 py-1.5 rounded-md text-xs font-mono",
          "text-ink transition-colors"
        )}
      >
        <FileText className="w-3 h-3 text-muted" />
        {selected ? selected.label : "Load sample"}
        <ChevronDown className="w-3 h-3 text-muted" />
      </button>

      {open && (
        <div
          className={clsx(
            "absolute right-0 top-full mt-1.5 w-[360px] z-20",
            "bg-white border border-border rounded-md shadow-clinical",
            "overflow-hidden"
          )}
        >
          <div className="px-3 py-2 border-b border-border bg-canvas">
            <div className="text-[11px] font-mono text-muted">
              Synthetic fixtures · no PHI
            </div>
          </div>

          <ul className="max-h-[400px] overflow-y-auto">
            {REFERRAL_FIXTURES.map((f) => {
              const isSelected = f.id === selectedId;
              return (
                <li key={f.id}>
                  <button
                    onClick={() => {
                      onSelect(f);
                      setOpen(false);
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-2.5 hover:bg-canvas",
                      "border-b border-border last:border-b-0 transition-colors",
                      isSelected && "bg-canvas"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-ink">
                            {f.label}
                          </span>
                          {isSelected && (
                            <Check className="w-3 h-3 text-success shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-muted mt-0.5 leading-snug">
                          {f.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] font-mono text-muted px-1.5 py-0.5 rounded bg-canvas border border-border">
                        {f.sourceFormat}
                      </span>
                      <span
                        className={clsx(
                          "text-[10px] font-mono px-1.5 py-0.5 rounded border",
                          f.urgencyHint === "Routine" &&
                            "text-muted bg-canvas border-border",
                          f.urgencyHint === "Urgent" &&
                            "text-warning bg-warning/5 border-warning/30",
                          f.urgencyHint === "Stat" &&
                            "text-danger bg-danger/5 border-danger/30"
                        )}
                      >
                        {f.urgencyHint}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}