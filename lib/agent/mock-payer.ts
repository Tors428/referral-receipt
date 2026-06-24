/**
 * Mock payer eligibility engine.
 *
 * Production target: replace with a real clearinghouse client (Availity,
 * Change Healthcare, Waystar) speaking X12 270 (Eligibility Request) and
 * parsing X12 271 (Eligibility Response). The shape of EligibilityResult
 * is a deliberate subset of the 271 fields the scheduling flow uses.
 *
 * Why this is mocked:
 *   - PHI-safe by design. No real payer credentials in this repo.
 *   - Deterministic outputs let us demo edge cases (OON, prior auth required)
 *     reliably.
 *   - Realistic 300-800ms latency so the UI exercises real loading states.
 */

import { EligibilityResult } from "@/lib/schemas/pipeline";

/* -------------------------------------------------------------------------- */
/*  Payer routing table                                                        */
/* -------------------------------------------------------------------------- */
/**
 * Each entry models a payer's typical behavior for the specialties this
 * demo handles. Real payer rules are vastly more complex — these are
 * representative but simplified.
 */
type PayerProfile = {
  matcher: (payerName: string) => boolean;
  isActive: boolean;
  isInNetwork: boolean;
  copayUsd: number | null;
  coinsuranceRate: number | null;
  deductibleRemainingUsd: number | null;
  priorAuthRequired: boolean;
  priorAuthNotes: string | null;
  warnings: string[];
};

const PAYER_PROFILES: PayerProfile[] = [
  {
    matcher: (p) => /blue shield/i.test(p),
    isActive: true,
    isInNetwork: true,
    copayUsd: 40,
    coinsuranceRate: 0.2,
    deductibleRemainingUsd: 350,
    priorAuthRequired: false,
    priorAuthNotes: null,
    warnings: [],
  },
  {
    matcher: (p) => /unitedhealthcare|united healthcare|uhc/i.test(p),
    isActive: true,
    isInNetwork: true,
    copayUsd: 50,
    coinsuranceRate: 0.2,
    deductibleRemainingUsd: 1200,
    priorAuthRequired: true,
    priorAuthNotes:
      "Cardiology consult: prior auth typically required for non-emergent referrals. Submit via UHC provider portal.",
    warnings: [],
  },
  {
    matcher: (p) => /medicare/i.test(p),
    isActive: true,
    isInNetwork: true,
    copayUsd: 0,
    coinsuranceRate: 0.2,
    deductibleRemainingUsd: 0,
    priorAuthRequired: false,
    priorAuthNotes: null,
    warnings: [
      "Medicare Part B: 20% coinsurance applies after deductible. Secondary coverage recommended for cost-share.",
    ],
  },
  {
    matcher: (p) => /kaiser/i.test(p),
    isActive: true,
    isInNetwork: false, // mock: assume external provider, not in Kaiser network
    copayUsd: null,
    coinsuranceRate: null,
    deductibleRemainingUsd: null,
    priorAuthRequired: true,
    priorAuthNotes:
      "Kaiser is a closed HMO. Out-of-network care requires Kaiser referral authorization or member must transfer care to a Kaiser facility.",
    warnings: [
      "Patient is a Kaiser member. Out-of-network care will not be covered without prior Kaiser authorization.",
    ],
  },
  {
    matcher: (p) => /aetna/i.test(p),
    isActive: true,
    isInNetwork: true,
    copayUsd: 45,
    coinsuranceRate: 0.2,
    deductibleRemainingUsd: 800,
    priorAuthRequired: false,
    priorAuthNotes: null,
    warnings: [],
  },
  {
    matcher: (p) => /cigna/i.test(p),
    isActive: true,
    isInNetwork: true,
    copayUsd: 45,
    coinsuranceRate: 0.2,
    deductibleRemainingUsd: 600,
    priorAuthRequired: false,
    priorAuthNotes: null,
    warnings: [],
  },
];

/**
 * Fallback profile when no payer match. Reflects what a real clearinghouse
 * returns when it cannot route a request: an indeterminate result that
 * the intake team must resolve manually.
 */
const UNKNOWN_PAYER_PROFILE: Omit<PayerProfile, "matcher"> = {
  isActive: false,
  isInNetwork: false,
  copayUsd: null,
  coinsuranceRate: null,
  deductibleRemainingUsd: null,
  priorAuthRequired: false,
  priorAuthNotes: null,
  warnings: [
    "Payer not recognized by clearinghouse. Manual verification required.",
  ],
};

/* -------------------------------------------------------------------------- */
/*  Out-of-state detection                                                     */
/* -------------------------------------------------------------------------- */
/**
 * Production X12 271 responses encode network status by service location.
 * Here we apply a simple heuristic: if the member ID contains a state
 * abbreviation token (e.g. "AET-TX-..."), we surface an out-of-state
 * warning that may affect in-network determination.
 */
function detectOutOfState(memberId: string): string | null {
  const oosPattern = /-(TX|FL|NY|IL|GA|OH|PA|NC|MI|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|MT|RI|DE|SD|ND|AK|VT|WY)-/i;
  const match = memberId.match(oosPattern);
  return match ? match[1].toUpperCase() : null;
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

export type EligibilityCheckInput = {
  payerName: string;
  memberId: string;
  planType?: string | null;
};

/**
 * Simulates a clearinghouse eligibility check. Resolves after a realistic
 * 300–800ms delay so the UI exercises real loading states.
 */
export async function checkEligibility(
  input: EligibilityCheckInput
): Promise<EligibilityResult> {
  const started = Date.now();

  // Simulate clearinghouse round-trip latency.
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

  // Find a matching profile, else fall back to unknown.
  const profile =
    PAYER_PROFILES.find((p) => p.matcher(input.payerName)) ?? null;

  const base = profile ?? { ...UNKNOWN_PAYER_PROFILE };

  // Layer in out-of-state warnings, which can override in-network status.
  const oosState = detectOutOfState(input.memberId);
  const warnings = [...base.warnings];
  let isInNetwork = base.isInNetwork;

  if (oosState) {
    warnings.push(
      `Member ID indicates ${oosState}-issued plan. Out-of-state plans frequently route to a different network than the local member directory; verify before scheduling.`
    );
    // Conservative: treat out-of-state plans as needing manual verification.
    isInNetwork = false;
  }

  const responseTimeMs = Date.now() - started;

  return {
    payerName: input.payerName,
    memberId: input.memberId,
    isActive: base.isActive,
    isInNetwork,
    coverageStartDate: base.isActive ? "2026-01-01" : null,
    coverageEndDate: base.isActive ? "2026-12-31" : null,
    copayUsd: base.copayUsd,
    coinsuranceRate: base.coinsuranceRate,
    deductibleRemainingUsd: base.deductibleRemainingUsd,
    priorAuthRequired: base.priorAuthRequired,
    priorAuthNotes: base.priorAuthNotes,
    warnings,
    mockTransactionId: generateMockX12TransactionId(),
    responseTimeMs,
  };
}

/**
 * Generates a pseudo X12 270/271 control number. Format mirrors a real
 * 9-digit transaction set control number (TST0102) for visual realism
 * in the audit trace. NOT a real X12 ID — purely cosmetic.
 */
function generateMockX12TransactionId(): string {
  const n = Math.floor(100_000_000 + Math.random() * 899_999_999);
  return `X12-271-${n}`;
}