"use client";

import { useState } from "react";
import { ShieldCheck, Play, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SampleDropdown } from "@/components/ui/SampleDropdown";
import type { ReferralFixture } from "@/lib/fixtures/referrals";
import { usePipeline } from "@/lib/use-pipeline";
import { ResultsPanel } from "@/components/ResultsPanel";

export default function Home() {
  const [rawText, setRawText] = useState("");
  const [sourceFixtureId, setSourceFixtureId] = useState<string | undefined>(undefined);

  const { state, run, reset } = usePipeline();

  const handleRun = () => {
    if (rawText.trim().length === 0) return;
    run(rawText, sourceFixtureId);
  };
  const handleReset = () => {
    setRawText("");
    setSourceFixtureId(undefined);
    reset();
  };

  const isRunning = state.status === "running";
  const isEmpty = rawText.trim().length === 0;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white font-mono text-sm font-bold">R</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold tracking-tight text-sm">Referral Receipt</span>
              <span className="text-[11px] font-mono text-muted">v0.1 · referral-to-visit agent</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={process.env.NEXT_PUBLIC_GITHUB_URL || "#"} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-1.5 border border-border bg-white hover:bg-canvas px-2.5 py-1 rounded-md text-[11px] font-mono text-ink transition-colors">
              <span className="text-muted">↗</span>
              GitHub
            </a>
            <Badge variant="success" className="gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              PHI-safe · synthetic data only
            </Badge>
          </div>
        </div>
      </header>

      <section className="flex-1 max-w-7xl mx-auto px-6 py-6 w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
        <div className="flex flex-col gap-4">
          <div className="bg-white border border-border rounded-lg shadow-clinical">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col leading-tight">
                <h2 className="font-semibold text-sm text-ink">Incoming referral</h2>
                <span className="text-[11px] font-mono text-muted">Paste a referral note, or load a synthetic sample</span>
              </div>
              <SampleDropdown
                selectedId={sourceFixtureId}
                onSelect={(fixture: ReferralFixture) => {
                  setRawText(fixture.rawText);
                  setSourceFixtureId(fixture.id);
                }}
              />
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste referral text here — fax cover, EMR export, secure email, phone transcript..."
              className="w-full h-[300px] lg:h-[420px] px-4 py-3 text-sm font-mono text-ink placeholder:text-muted/70 bg-white resize-none outline-none rounded-b-lg"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-muted">{rawText.length.toLocaleString()} chars</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={isEmpty || isRunning}
                className="flex items-center gap-1.5 border border-border bg-white hover:bg-canvas text-ink px-3 py-2 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                onClick={handleRun}
                disabled={isEmpty || isRunning}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-md text-sm font-medium shadow-clinical disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[140px] justify-center"
              >
                {isRunning ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Running
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Run pipeline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-1">
          <ResultsPanel state={state} />
        </div>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-3 text-[11px] text-muted font-mono">
          <span className="truncate">Referral Receipt · synthetic-data prototype of a healthcare intake agent</span>
          <span className="shrink-0 hidden sm:inline">llama-3.3-70b · FHIR-inspired · mock X12 270/271</span>
        </div>
      </footer>
    </main>
  );
}