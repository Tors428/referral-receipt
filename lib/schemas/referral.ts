/**
 * Referral extraction schemas.
 *
 * These are FHIR-INSPIRED, not full FHIR R4 conformant. We use FHIR's resource
 * names and shapes (Patient, Practitioner, Coverage, ServiceRequest) so the
 * extracted payload is recognizable to anyone working with EHR data, but we
 * deliberately collapse fields that are irrelevant for referral intake.
 *
 * Production targets: would expand to full FHIR R4 conformance + bind to
 * SNOMED-CT / LOINC / ICD-10 value sets via terminology server.
 *
 * Every extracted field carries a confidence score (0–1) so the UI can flag
 * low-confidence values for human review — the agent never silently guesses
 * on clinical data.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  Primitive: confidence-wrapped value                                        */
/* -------------------------------------------------------------------------- */

/**
 * Every leaf field the LLM extracts is wrapped in a Confident<T> envelope
 * with a 0–1 score and a short reasoning string. This is the core mechanic
 * that lets the UI badge low-confidence fields for human review.
 */
export const ConfidentString = z.object({
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});
export type ConfidentString = z.infer<typeof ConfidentString>;

export const ConfidentDate = z.object({
  value: z.string().nullable(), // ISO 8601 date (YYYY-MM-DD)
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});
export type ConfidentDate = z.infer<typeof ConfidentDate>;

export const ConfidentEnum = <T extends [string, ...string[]]>(values: T) =>
  z.object({
    value: z.enum(values).nullable(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().optional(),
  });

/* -------------------------------------------------------------------------- */
/*  Patient                                                                    */
/* -------------------------------------------------------------------------- */
/**
 * FHIR Patient (simplified). Production version would include identifier
 * system URIs, address objects, communication preferences, and resource
 * versioning.
 */
export const PatientSchema = z.object({
  resourceType: z.literal("Patient"),
  fullName: ConfidentString,
  dateOfBirth: ConfidentDate,
  sex: ConfidentEnum(["male", "female", "other", "unknown"]),
  phone: ConfidentString,
  mrn: ConfidentString,         // medical record number at referring facility
  preferredLanguage: ConfidentString,
});
export type Patient = z.infer<typeof PatientSchema>;

/* -------------------------------------------------------------------------- */
/*  Practitioner (referring provider)                                          */
/* -------------------------------------------------------------------------- */
/**
 * FHIR Practitioner (simplified). Captures the referring clinician.
 */
export const PractitionerSchema = z.object({
  resourceType: z.literal("Practitioner"),
  fullName: ConfidentString,
  credentials: ConfidentString,   // e.g. "MD", "DO", "NP"
  npi: ConfidentString,           // National Provider Identifier (10 digits)
  facility: ConfidentString,
});
export type Practitioner = z.infer<typeof PractitionerSchema>;

/* -------------------------------------------------------------------------- */
/*  Coverage (insurance)                                                       */
/* -------------------------------------------------------------------------- */
/**
 * FHIR Coverage (simplified). Captures the primary payer details the
 * eligibility check will need. Secondary coverage handled by repeating
 * this resource in ExtractedReferral.coverage[].
 */
export const CoverageSchema = z.object({
  resourceType: z.literal("Coverage"),
  payerName: ConfidentString,     // e.g. "Blue Shield CA PPO"
  memberId: ConfidentString,      // subscriber/member identifier
  groupNumber: ConfidentString,
  planType: ConfidentEnum([
    "PPO",
    "HMO",
    "EPO",
    "POS",
    "Medicare",
    "Medicaid",
    "Medigap",
    "Other",
    "Unknown",
  ]),
  isPrimary: z.boolean(),
});
export type Coverage = z.infer<typeof CoverageSchema>;

/* -------------------------------------------------------------------------- */
/*  ServiceRequest (the referral itself)                                       */
/* -------------------------------------------------------------------------- */
/**
 * FHIR ServiceRequest (simplified). Represents the clinical ask: what
 * specialty, why, and how urgent.
 */
export const ServiceRequestSchema = z.object({
  resourceType: z.literal("ServiceRequest"),
  specialty: ConfidentString,           // e.g. "Orthopedics", "Cardiology"
  reasonForReferral: ConfidentString,   // free-text clinical reasoning
  icd10Codes: z.array(
    z.object({
      code: z.string(),
      description: z.string().optional(),
      confidence: z.number().min(0).max(1),
    })
  ),
  cptCodes: z.array(
    z.object({
      code: z.string(),
      description: z.string().optional(),
      confidence: z.number().min(0).max(1),
    })
  ),
  priority: ConfidentEnum(["routine", "urgent", "stat"]),
  schedulingWindow: ConfidentString,    // e.g. "within 2 weeks", "30 days"
});
export type ServiceRequest = z.infer<typeof ServiceRequestSchema>;

/* -------------------------------------------------------------------------- */
/*  Top-level ExtractedReferral                                                */
/* -------------------------------------------------------------------------- */
/**
 * The full structured payload the extraction agent produces from one
 * unstructured referral. This is what the eligibility check and the
 * outreach drafter both consume downstream.
 */
export const ExtractedReferralSchema = z.object({
  extractionId: z.string(),             // uuid for this extraction run
  sourceFixtureId: z.string().optional(),
  extractedAt: z.string(),              // ISO timestamp

  patient: PatientSchema,
  referringProvider: PractitionerSchema,
  coverage: z.array(CoverageSchema),    // primary + optional secondary
  serviceRequest: ServiceRequestSchema,

  // Fields the LLM could not locate at all — surfaced explicitly so the UI
  // can show "Missing" rather than silently omitting.
  missingFields: z.array(z.string()),

  // Free-text overall summary from the LLM, useful for the audit trace.
  extractionNotes: z.string().optional(),
});
export type ExtractedReferral = z.infer<typeof ExtractedReferralSchema>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Confidence threshold below which a field should be flagged for human
 * review in the UI. Tunable; 0.70 is the current default.
 */
export const HUMAN_REVIEW_THRESHOLD = 0.7;

/**
 * Returns true if a confidence-wrapped value should be flagged for review.
 * Either explicitly null, or below the threshold.
 */
export function needsReview(
  field: { value: string | null; confidence: number }
): boolean {
  return field.value === null || field.confidence < HUMAN_REVIEW_THRESHOLD;
}

/**
 * Walks an ExtractedReferral and returns a flat list of field paths that
 * need human review. Used to populate the "Human Review" panel in the UI.
 */
export function collectReviewFlags(
  extracted: ExtractedReferral
): { path: string; confidence: number; reason: string }[] {
  const flags: { path: string; confidence: number; reason: string }[] = [];

  const check = (
    path: string,
    field: { value: string | null; confidence: number }
  ) => {
    if (needsReview(field)) {
      flags.push({
        path,
        confidence: field.confidence,
        reason:
          field.value === null
            ? "Field not found in source text"
            : `Confidence ${field.confidence.toFixed(2)} below threshold ${HUMAN_REVIEW_THRESHOLD}`,
      });
    }
  };

  // Patient
  check("patient.fullName", extracted.patient.fullName);
  check("patient.dateOfBirth", extracted.patient.dateOfBirth);
  check("patient.sex", extracted.patient.sex);
  check("patient.phone", extracted.patient.phone);
  check("patient.mrn", extracted.patient.mrn);

  // Practitioner
  check("referringProvider.fullName", extracted.referringProvider.fullName);
  check("referringProvider.npi", extracted.referringProvider.npi);

  // Coverage (each)
  extracted.coverage.forEach((cov, i) => {
    check(`coverage[${i}].payerName`, cov.payerName);
    check(`coverage[${i}].memberId`, cov.memberId);
    check(`coverage[${i}].planType`, cov.planType);
  });

  // ServiceRequest
  check("serviceRequest.specialty", extracted.serviceRequest.specialty);
  check("serviceRequest.priority", extracted.serviceRequest.priority);

  return flags;
}