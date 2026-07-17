export type IdentityProvider = "manual" | "didit";

export type IdentityDecision =
  "auto_verified" | "manual_review" | "provider_unavailable";

export type IdentitySignals = {
  documentAuthenticity: number | null;
  documentQuality: number | null;
  faceMatch: number | null;
  liveness: number | null;
  profileDataMatched: boolean | null;
  documentValid: boolean | null;
};

export type IdentityAssessment = {
  provider: IdentityProvider;
  score: number | null;
  decision: IdentityDecision;
  reasons: string[];
  signals: IdentitySignals;
  assessedAt: string;
};

export type ReadinessCheck = {
  id: string;
  label: string;
  ready: boolean;
  required: boolean;
  action?: string;
  provider?: string;
};

export type ProctoringReadiness = {
  provider: IdentityProvider;
  mode: "local" | "supabase";
  migrationApplied: boolean;
  canAutoVerifyIdentity: boolean;
  canAssistMonitoring: boolean;
  requiresExternalProvider: boolean;
  checks: ReadinessCheck[];
  summary: string;
};
