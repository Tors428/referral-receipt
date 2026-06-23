/**
 * Synthetic referral fixtures.
 *
 * Every field below is fabricated for development and demonstration only.
 * No real patient data, no PHI, no scraped clinical records.
 *
 * Format variety is intentional — production referral intake faces faxed PCP
 * notes, EMR exports, secure-email forwards, and direct-message threads, each
 * with different abbreviation density and field ordering. Robust extraction
 * has to survive all of them.
 */

export type ReferralFixture = {
  id: string;
  label: string;          // shown in the "Load sample" dropdown
  sourceFormat:
    | "Faxed PCP note"
    | "EMR referral export"
    | "Secure email"
    | "Direct message"
    | "Phone intake transcript";
  urgencyHint: "Routine" | "Urgent" | "Stat";
  description: string;    // one-line summary of what makes this fixture interesting
  rawText: string;
};

export const REFERRAL_FIXTURES: ReferralFixture[] = [
  {
    id: "ref-001",
    label: "Routine ortho — clean fax",
    sourceFormat: "Faxed PCP note",
    urgencyHint: "Routine",
    description:
      "Typical clean fax from a PCP. All fields present. Baseline happy-path case.",
    rawText: `FAX COVER — RIVERSIDE FAMILY MEDICINE
To: Bay Ortho Specialists  Attn: Referrals
From: Dr. A. Mehta, MD     NPI: 1659432011
Date: 06/18/2026           Pages: 1

Pt: Jane D. Whitford
DOB: 04/12/1981  Sex: F
MRN (Riverside): RFM-44218
Phone: (415) 555-0142
Address: 1820 Geary Blvd, San Francisco CA 94115

Insurance: Blue Shield CA PPO
Member ID: XJB4421-08
Group: 7741A

REFERRAL: Orthopedic consult, R knee
HX: 6-week hx of R medial knee pain, no acute trauma. Failed
2-wk course of NSAIDs + PT. AP/lat XR (06/15) shows mild
medial joint space narrowing. Suspect early OA vs meniscal.
Pls eval and advise re: MRI and/or steroid injection.
Schedule within 2 wks.

ICD-10: M17.11
CPT (request): 99244

Signed,
A. Mehta MD`,
  },

  {
    id: "ref-002",
    label: "Urgent cardiology — sparse details",
    sourceFormat: "Secure email",
    urgencyHint: "Urgent",
    description:
      "Brief urgent email. Missing group number and address. Tests how the agent handles sparse input + flags low-confidence fields.",
    rawText: `From: r.okonkwo@parkside-internal.med
To: intake@sf-cardio.com
Subject: URGENT cardio referral - Tomas Reyes
Sent: Tue Jun 16 2026 14:22

Hi team,

Sending over Tomas Reyes (DOB 11/3/1968) for urgent cardiology eval.
New-onset AFib found on routine EKG yesterday, HR 118 irregular.
Asymptomatic but rate uncontrolled. Started on metoprolol 25mg BID
this AM. Needs eval within 3-5 days.

Insurance: UnitedHealthcare. ID UHC9920-3318.
Pt cell: 408-555-0193

Thx,
Rachel Okonkwo NP
Parkside Internal Medicine`,
  },

  {
    id: "ref-003",
    label: "EMR export — structured, dense",
    sourceFormat: "EMR referral export",
    urgencyHint: "Routine",
    description:
      "Structured EMR export with consistent labels. Easy parsing, but tests handling of dense ICD/CPT coding lists.",
    rawText: `===== EPIC REFERRAL EXPORT =====
EXPORT_TIMESTAMP: 2026-06-19T09:14:22Z
REFERRING_FACILITY: Sunset Primary Care Group
REFERRING_PROVIDER: Linh T. Pham, DO (NPI 1346678201)

[PATIENT]
NAME: Marcus Devon Holloway
DOB: 1955-08-23
SEX: M
MRN: SPCG-009824
CONTACT_PHONE: +1-510-555-0277
PREFERRED_LANGUAGE: English

[COVERAGE]
PRIMARY_PAYER: Medicare Part B
MEMBER_ID: 1EG4-TE5-MK72
SECONDARY_PAYER: AARP Medigap Plan G
SECONDARY_MEMBER_ID: AMG-558019

[REFERRAL]
SPECIALTY: Gastroenterology
REASON: Screening colonoscopy, 10 years overdue. Pt has been deferring.
        Recent FIT positive (05/28/2026).
PRIORITY: Routine
SCHEDULING_WINDOW: 30 days

[DIAGNOSES]
- Z12.11 (Encounter for screening for malignant neoplasm of colon)
- R19.5  (Other fecal abnormalities)

[REQUESTED_PROCEDURES]
- 45378 (Colonoscopy, diagnostic)

[NOTES]
Pt anxious re: procedure. Pls call to discuss prep + sedation
options before scheduling. Best reached afternoons.

===== END EXPORT =====`,
  },

  {
    id: "ref-004",
    label: "Dermatology DM — informal, ambiguous",
    sourceFormat: "Direct message",
    urgencyHint: "Routine",
    description:
      "Casual DM between providers. Missing insurance, ambiguous DOB format, no MRN. Stress test for graceful degradation.",
    rawText: `[DM thread — Spruce app]

Dr. K Sandoval (PCP):
hey, sending one over. Priya Anand, has this weird scaling
patch on her L forearm, been there ~4 mo, not responding to
OTC hydrocortisone. ddx: nummular eczema vs psoriasis vs
something fungal. no fever, no joint pain.

she's 34, dob i think 7/18/91 — let me double check
phone is 650-555-0166
no rush, routine consult

(will send insurance over separately, she's switching plans
this month so wanted to wait til it's settled)`,
  },

  {
    id: "ref-005",
    label: "Stat neuro — phone intake",
    sourceFormat: "Phone intake transcript",
    urgencyHint: "Stat",
    description:
      "Same-day urgent phone intake. Tests handling of stat urgency + transcription artifacts.",
    rawText: `[Phone intake — transcribed 06/20/2026 08:47 PT]
Caller: Dr. Wei Chen, ER attending, Mission Bay Urgent Care

"Hi yeah I need to get a patient seen today if possible.
Eleanor — let me spell that — E-L-E-A-N-O-R, last name Briggs,
B-R-I-G-G-S. Date of birth April 2nd, 1949. She's 77.

She came in this morning with a 3-day history of left-sided
weakness and some word-finding difficulty. CT head here is
negative for bleed but I'm worried about a small subacute
stroke and I want her seen by neuro today, not next week.

Insurance is Kaiser — she's a Kaiser member but she came to
us because we were closest. Member number is, uh, let me read
it, K-P-N-C-7-7-2-4-8-1-9.

Her cell is 415-555-0108. She lives alone in Pacifica.
Please call me back at the ER, 415-555-2200, when you can
get her scheduled. Thanks."

[End transcript]`,
  },

  {
    id: "ref-006",
    label: "Out-of-network ambiguity",
    sourceFormat: "Faxed PCP note",
    urgencyHint: "Routine",
    description:
      "Insurance details suggest possible out-of-network status. Tests how the eligibility check surfaces and the UI flags coverage warnings.",
    rawText: `MAPLE CREEK FAMILY HEALTH — REFERRAL
Date: 06/17/2026
Referring: Dr. S. Patel, MD (NPI 1772384409)

Patient: Daniel Park
DOB: 09/14/1978
Sex: M
MRN: MCFH-1108
Phone: (925) 555-0144

Insurance: Aetna (out of state — Texas employer plan)
Member ID: AET-TX-44892017
Group: TXLG-220

Referring to: Endocrinology
Reason: T2DM, A1C 9.4 (06/10/2026), on metformin 1000 BID
+ glipizide. Needs intensification, consider GLP-1.
Pt also reports new numbness in feet bilaterally x2 weeks —
r/o neuropathy.

ICD-10: E11.65, E11.42
Priority: Routine, w/in 3-4 wks.

Note: pt's plan is TX-based, please verify in-network status
before scheduling. Pt willing to pay OON if needed but wants
to know cost upfront.

— S. Patel MD`,
  },
];

/**
 * Helper: get a fixture by id. Returns undefined if not found.
 */
export function getFixtureById(id: string): ReferralFixture | undefined {
  return REFERRAL_FIXTURES.find((f) => f.id === id);
}
