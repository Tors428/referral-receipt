import { FileText, ShieldCheck, Workflow } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white font-mono text-sm font-bold">R</span>
            </div>
            <span className="font-semibold tracking-tight">Referral Receipt</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            PHI-safe · synthetic data only
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-accent border border-accent/30 bg-accent/5 px-2.5 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Referral-to-visit agent
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-ink leading-tight">
            Turn an unstructured referral into a scheduled visit —{" "}
            <span className="text-primary">with a receipt for every step.</span>
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed">
            Ingests a referral note, extracts structured FHIR-style fields, checks
            payer eligibility, and drafts patient outreach. Every step is logged,
            every low-confidence field is flagged for human review.
          </p>

          <div className="mt-10 flex items-center gap-3">
            <button className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-md text-sm font-medium shadow-clinical transition-colors">
              Try a sample referral
            </button>
            <button className="border border-border bg-white hover:bg-canvas text-ink px-5 py-2.5 rounded-md text-sm font-medium transition-colors">
              View architecture
            </button>
          </div>
        </div>

        {/* Three-step preview */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: FileText,
              title: "Extract",
              body: "LLM pulls FHIR-shaped fields from the referral text with per-field confidence scores.",
            },
            {
              icon: Workflow,
              title: "Verify",
              body: "Mock payer API checks eligibility, copay, and prior-auth requirements in real time.",
            },
            {
              icon: ShieldCheck,
              title: "Draft",
              body: "Patient outreach message generated, with the full audit trace exportable as JSON.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="bg-white border border-border rounded-lg p-5 shadow-clinical"
            >
              <Icon className="w-5 h-5 text-accent mb-3" />
              <h3 className="font-semibold text-ink mb-1.5">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-muted font-mono">
          <span>v0.1 · Phase 1 scaffold</span>
          <span>No real patient data · synthetic fixtures only</span>
        </div>
      </footer>
    </main>
  );
}