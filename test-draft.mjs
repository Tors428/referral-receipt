/**
 * Quick end-to-end test for /api/draft-outreach.
 * Chains extract → eligibility → draft for three different cases.
 * Run with: node test-draft.mjs
 */

const BASE = "http://localhost:3000";

const CASES = [
  {
    label: "Test A — Routine ortho, Blue Shield (happy path)",
    rawText: `FAX COVER\nPt: Jane D. Whitford\nDOB: 04/12/1981\nInsurance: Blue Shield CA PPO\nMember ID: XJB4421-08\nReferral: Orthopedic consult, R knee. 6-week hx of R medial knee pain. Schedule within 2 wks.\nICD-10: M17.11\nSigned, Dr. A. Mehta MD, NPI 1659432011`,
  },
  {
    label: "Test B — Urgent cardio, UHC (prior auth required)",
    rawText: `From: r.okonkwo@parkside-internal.med\nSubject: URGENT cardio referral - Tomas Reyes\n\nSending over Tomas Reyes (DOB 11/3/1968) for urgent cardiology eval. New-onset AFib found on routine EKG yesterday, HR 118 irregular. Needs eval within 3-5 days.\nInsurance: UnitedHealthcare. ID UHC9920-3318.`,
  },
  {
    label: "Test C — Stat neuro, Kaiser (out-of-network)",
    rawText: `Phone intake: Dr. Wei Chen, ER attending. Patient Eleanor Briggs, DOB April 2 1949. 3-day history of left-sided weakness and word-finding difficulty. CT head negative for bleed. Needs neuro eval TODAY. Insurance: Kaiser, member KPNC7724819. Cell 415-555-0108.`,
  },
];

async function run() {
  for (const c of CASES) {
    console.log("\n=====================================");
    console.log(c.label);
    console.log("=====================================");

    // 1. Extract
    const extractRes = await fetch(`${BASE}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: c.rawText }),
    });
    if (!extractRes.ok) {
      console.error("Extract failed:", await extractRes.text());
      continue;
    }
    const { extracted } = await extractRes.json();
    console.log(
      `→ Extracted: ${extracted.patient.fullName.value}, priority=${extracted.serviceRequest.priority.value}`
    );

    // 2. Eligibility (use first coverage)
    const cov = extracted.coverage[0];
    const eligRes = await fetch(`${BASE}/api/payer/eligibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payerName: cov.payerName.value,
        memberId: cov.memberId.value,
      }),
    });
    if (!eligRes.ok) {
      console.error("Eligibility failed:", await eligRes.text());
      continue;
    }
    const eligibility = await eligRes.json();
    console.log(
      `→ Eligibility: inNetwork=${eligibility.isInNetwork}, priorAuth=${eligibility.priorAuthRequired}`
    );

    // 3. Draft outreach
    const draftRes = await fetch(`${BASE}/api/draft-outreach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extracted, eligibility }),
    });
    if (!draftRes.ok) {
      console.error("Draft failed:", await draftRes.text());
      continue;
    }
    const { draft, latencyMs } = await draftRes.json();

    console.log(`\n--- DRAFT (${draft.channel} / ${draft.tone}) ---`);
    if (draft.subject) console.log(`Subject: ${draft.subject}`);
    console.log(draft.body);
    console.log(`\nReading level: ${draft.estimatedReadingLevelGrade}`);
    console.log(`Flags: ${JSON.stringify(draft.contains)}`);
    console.log(`Latency: ${latencyMs}ms`);
  }
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});