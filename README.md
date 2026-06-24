# Referral Receipt

**An agentic pipeline that turns an unstructured patient referral into a scheduled-visit-ready receipt — with a step-by-step audit trace and human-review flags for every low-confidence field.**

PHI-safe by design. No real patient data. Synthetic fixtures only.

🔗 **Live demo:** (https://referral-receipt.vercel.app)
<img width="800" height="419" alt="referral-receipt" src="https://github.com/user-attachments/assets/17e3fae6-35e8-4dca-b550-6d358286d733" />


---

## Why this exists

Specialty clinics lose meaningful revenue to **referral leakage** — referrals that arrive from PCPs and never convert to scheduled visits. The root cause is rarely clinical; it's operational. A faxed referral lands in an intake queue, sits there until someone keys it into the EHR, gets bounced back when insurance can't be verified, and by the time it's resolved, the patient has gone somewhere else or given up.

The intake workflow itself is structurally automatable: read the referral → pull the structured fields → verify coverage with the payer → reach out to the patient. The reason it isn't fully automated today isn't that the AI can't do it — it's that healthcare AI failures are not the kind of failure you can afford to ship without a paper trail.

**Referral Receipt is a prototype of that workflow, built around the principle that every step the agent takes must be inspectable and every low-confidence decision must be flagged before it touches a patient.**

---

## What it does

1. **Ingest** an unstructured referral (faxed PCP note, EMR export, secure email, phone-intake transcript, direct message — six synthetic fixture formats included)
2. **Extract** structured FHIR-inspired fields using an LLM (`llama-3.3-70b-versatile` via Groq), with a per-field confidence score
3. **Verify** payer eligibility against a mock clearinghouse modeled on the X12 270/271 exchange
4. **Draft** patient outreach — tone- and channel-aware (SMS / voice script / email), with plain-language reading level
5. **Emit a receipt** — a step-by-step audit trace with timestamps, durations, masked PHI, and a one-click JSON export

Fields with confidence below the human-review threshold (0.70) are flagged for manual review rather than silently used.

---

## Design principles

| Principle | How it shows up |
|---|---|
| **Never fabricate patient data** | The extractor returns `null` + confidence `0.0` for missing fields rather than guessing |
| **Confidence is a first-class output** | Every leaf field is `{ value, confidence, reasoning }`, not a bare string |
| **Audit before action** | Every stage logs an `AuditStep` before the next stage starts |
| **PHI hygiene even on synthetic data** | Member IDs are masked in logs and UI (`******1-08`), modeling production behavior |
| **Healthcare standards literacy** | FHIR-shaped resource types (Patient, Practitioner, Coverage, ServiceRequest); X12 270/271 framing for the eligibility check |

---

## Architecture

    ┌──────────────────────────────────────────────────────────────────┐
    │                        POST /api/run                              │
    │                                                                   │
    │  Raw referral text ──▶ Orchestrator (lib/agent/orchestrator.ts)  │
    │                                                                   │
    │   1. Ingest          → AuditStep                                  │
    │   2. Extract         → Groq LLM call #1 + Zod validation          │
    │                        Produces FHIR-shaped ExtractedReferral     │
    │                        with per-field confidence                  │
    │   3. Eligibility     → Mock X12 270 → 271 routing table           │
    │                        (Blue Shield, UHC, Kaiser, Aetna, Medicare,│
    │                        Cigna + unknown-payer fallback)            │
    │   4. Draft outreach  → Groq LLM call #2                           │
    │                        Tone- and channel-aware, plain language    │
    │   5. Review flagging → Walks extraction against 0.70 threshold    │
    │   6. Complete        → Seals the AuditTrace                       │
    │                                                                   │
    │  Returns: { trace, extracted, eligibility, draft, reviewFlags }   │
    └──────────────────────────────────────────────────────────────────┘

Failure in any stage is captured as an `AuditStep` with `stepType: "error"` and the partial trace is returned to the caller — so a failed pipeline is still inspectable.

---

## Stack

- **Next.js 15** (App Router, TypeScript, Turbopack)
- **Tailwind CSS v4** with a clinical color palette (deep navy primary, modern cyan accent, off-white canvas)
- **Groq** for LLM inference (`llama-3.3-70b-versatile`)
- **Zod** for runtime schema validation at every LLM boundary
- **lucide-react** for icons
- **In-memory state only** — no database. Persistent audit storage is a deliberate post-MVP concern.

---

## What I learned building this

A few things came up that I wouldn't have anticipated from reading about healthcare AI:

- **Confidence has to be a first-class output, not an afterthought.** My first instinct was to return clean extracted JSON and let the UI decide what to flag. That doesn't work — downstream stages (eligibility, outreach) need to know whether a field is trustworthy before they consume it. Pushing `{ value, confidence, reasoning }` all the way through the schema changed how every stage was designed.

- **The model will lie about urgency if you let it.** My first prompt mapped "schedule within 2 weeks" to `urgent`, which is a clinical false positive — a 2-week window is routine. I had to give the model explicit examples and tell it to be conservative when the source doesn't use the words "urgent" or "stat." Calibrating LLM judgment to *clinical* norms (not general English) is most of the prompt engineering work.

- **Healthcare data hygiene applies even when the data is fake.** I started by logging member IDs in full because they were synthetic. Then I realized the audit trace is the artifact I'd be showing to a healthcare reviewer, and a healthcare reviewer reads `memberId=XJB4421-08` in a log file and reflexively flags it as a PHI leak — even on a demo. Masking the IDs in the UI and the trace, even on synthetic data, became part of the point.

- **FHIR isn't intimidating once you stop trying to be conformant.** I deliberately chose FHIR-*inspired* rather than FHIR R4 conformant — using the resource names (Patient, Practitioner, Coverage, ServiceRequest) for shape and recognizability, without the binding-and-extension complexity. The README and the code both say this honestly. That trade-off was probably the most useful design decision I made.

- **Auditability is a UI problem, not just a logging problem.** The orchestrator logs perfectly structured `AuditStep` objects, but those are useless to a reviewer unless the UI surfaces them cleanly. Building the `AuditTracePanel` — collapsible steps, type-coded icons, JSON export — was where the "receipt" thesis became visible. Without it, the audit trail is invisible infrastructure.

- **Failure paths are part of the product.** It would have been easy to crash on missing fields or malformed LLM output. Instead the orchestrator returns a sealed partial trace with an `error` step at the failing stage. That made debugging easier *and* made the failure UX feel intentional rather than broken.

---

## What I'd build next

The current implementation is deliberately MVP-shaped. Production targets, in priority order:

1. **Persistent audit storage** — the trace is in-memory per request today. Production would write traces to an append-only store (Postgres + S3 for the full payloads) and expose a search/replay UI for the intake team.
2. **An evaluation harness** — held-out set of referrals with ground-truth annotations to catch extraction drift as prompts or models change. Without this, every prompt edit is a guess.
3. **Real clearinghouse integration** — swap `lib/agent/mock-payer.ts` for an Availity or Change Healthcare client speaking real X12 270/271.
4. **EHR write-back** — Epic / Athena / RIS integration so the extracted `ServiceRequest` actually populates the receptionist's queue. The hardest piece by far — EHR integration is the moat in healthcare automation.
5. **Channel adapters wired** — the outreach drafter chooses a channel; production needs Twilio / SendGrid / phone-script handoff actually connected.
6. **Full FHIR R4 conformance** — current schemas are FHIR-inspired; production would bind to SNOMED-CT / LOINC / ICD-10 value sets via a terminology server.
7. **Multi-coverage handling in the eligibility stage** — today only the primary coverage is checked. Medicare-with-Medigap is common and the secondary plan affects cost-share calculation.
8. **Confidence-threshold tuning by field** — 0.70 is one global number today. In practice, the cost of a wrong `dateOfBirth` is much higher than a wrong `preferredLanguage`, so the threshold should be per-field.

---

## Running locally

```bash
# 1. Clone and install
git clone <this-repo>
cd referral-receipt
npm install

# 2. Add a Groq API key (free at https://console.groq.com/keys)
cp .env.example .env.local
# then edit .env.local and paste your key

# 3. Run
npm run dev
# open http://localhost:3000
```

The dropdown in the top-right of the input panel loads six synthetic referrals across formats and urgencies — start there.

---

## A note on the live demo

The hosted demo runs on Groq's free tier, which is generous but not infinite. Each visitor can run up to 5 pipelines per hour, and the demo as a whole serves up to 200 pipelines per day. If you hit either limit, the UI will tell you — and the fastest fix is to clone the repo and run it locally with your own free key (instructions above). The rate limiter lives in `lib/agent/rate-limit.ts`.

---

## License

MIT
