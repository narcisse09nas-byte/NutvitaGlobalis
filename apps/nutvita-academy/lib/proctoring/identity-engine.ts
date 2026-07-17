import type {
  IdentityAssessment,
  IdentityProvider,
  IdentitySignals,
  ProctoringReadiness,
  ReadinessCheck,
} from "@/types/identity-engine";
import { isSupabaseConfigured } from "@/lib/env";

const WEIGHTS = {
  documentAuthenticity: 0.2,
  documentQuality: 0.05,
  faceMatch: 0.35,
  liveness: 0.25,
  profileDataMatched: 0.1,
  documentValid: 0.05,
} as const;

function bounded(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

export function evaluateIdentitySignals(input: {
  provider: IdentityProvider;
  providerReady: boolean;
  threshold: number;
  signals: IdentitySignals;
}): IdentityAssessment {
  const threshold = Math.min(100, Math.max(85, input.threshold));
  const signals = {
    ...input.signals,
    documentAuthenticity: bounded(input.signals.documentAuthenticity),
    documentQuality: bounded(input.signals.documentQuality),
    faceMatch: bounded(input.signals.faceMatch),
    liveness: bounded(input.signals.liveness),
  };
  const reasons: string[] = [];

  if (input.provider === "manual" || !input.providerReady) {
    reasons.push("Aucun fournisseur biométrique vérifié n’est actif.");
    return {
      provider: input.provider,
      score: null,
      decision: "provider_unavailable",
      reasons,
      signals,
      assessedAt: new Date().toISOString(),
    };
  }

  const numericSignals = [
    signals.documentAuthenticity,
    signals.documentQuality,
    signals.faceMatch,
    signals.liveness,
  ];
  if (numericSignals.some((value) => value === null)) {
    reasons.push(
      "Le fournisseur n’a pas retourné toutes les preuves obligatoires.",
    );
  }
  if (signals.profileDataMatched !== true)
    reasons.push(
      "Les données du document et du profil ne concordent pas entièrement.",
    );
  if (signals.documentValid !== true)
    reasons.push("La validité du document n’est pas confirmée.");

  const score = Math.round(
    (signals.documentAuthenticity ?? 0) * WEIGHTS.documentAuthenticity +
      (signals.documentQuality ?? 0) * WEIGHTS.documentQuality +
      (signals.faceMatch ?? 0) * WEIGHTS.faceMatch +
      (signals.liveness ?? 0) * WEIGHTS.liveness +
      (signals.profileDataMatched ? 100 : 0) * WEIGHTS.profileDataMatched +
      (signals.documentValid ? 100 : 0) * WEIGHTS.documentValid,
  );

  const criticalSignalsPass =
    signals.documentAuthenticity !== null &&
    signals.documentAuthenticity >= threshold &&
    signals.faceMatch !== null &&
    signals.faceMatch >= threshold &&
    signals.liveness !== null &&
    signals.liveness >= threshold &&
    signals.profileDataMatched === true &&
    signals.documentValid === true;

  if (score < threshold)
    reasons.push(
      `Le score explicable de ${score}% est inférieur au seuil de ${threshold}%.`,
    );
  if (!criticalSignalsPass && reasons.length === 0)
    reasons.push(
      "Au moins un contrôle critique est inférieur au seuil requis.",
    );

  return {
    provider: input.provider,
    score,
    decision:
      score >= threshold && criticalSignalsPass
        ? "auto_verified"
        : "manual_review",
    reasons,
    signals,
    assessedAt: new Date().toISOString(),
  };
}

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function getProctoringReadiness(
  migrationApplied = false,
): ProctoringReadiness {
  const requestedProvider =
    process.env.PROCTORING_IDENTITY_PROVIDER?.toLowerCase();
  const provider: IdentityProvider =
    requestedProvider === "didit" ? "didit" : "manual";
  const supabaseReady =
    isSupabaseConfigured() && configured("SUPABASE_SERVICE_ROLE_KEY");
  const checks: ReadinessCheck[] = [
    {
      id: "supabase",
      label: "Supabase et clé de service",
      ready: supabaseReady,
      required: true,
      action:
        "Renseigner NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY.",
      provider: "Supabase",
    },
    {
      id: "migration",
      label: "Migration 007 du moteur d’identité",
      ready: migrationApplied,
      required: true,
      action: "Appliquer supabase/migrations/007_ai_identity_proctoring.sql.",
      provider: "Supabase",
    },
    {
      id: "didit-api",
      label: "Compte KYC et clé API",
      ready: configured("DIDIT_API_KEY"),
      required: true,
      action: "Créer gratuitement un compte Didit et renseigner DIDIT_API_KEY.",
      provider: "Didit",
    },
    {
      id: "didit-workflow",
      label: "Workflow pièce + preuve de vie + visage",
      ready: configured("DIDIT_WORKFLOW_ID"),
      required: true,
      action:
        "Créer un workflow Didit avec ID Verification, Liveness et Face Match, puis renseigner DIDIT_WORKFLOW_ID.",
      provider: "Didit",
    },
    {
      id: "didit-webhook",
      label: "Webhook de résultats signé",
      ready: configured("DIDIT_WEBHOOK_SECRET"),
      required: true,
      action:
        "Configurer Didit vers /api/proctoring/identity/didit-webhook, puis renseigner DIDIT_WEBHOOK_SECRET.",
      provider: "Didit",
    },
  ];
  const externalReady = checks
    .filter((check) =>
      ["didit-api", "didit-workflow", "didit-webhook"].includes(check.id),
    )
    .every((check) => check.ready);
  const canAutoVerifyIdentity =
    provider === "didit" && supabaseReady && migrationApplied && externalReady;

  return {
    provider,
    mode: supabaseReady ? "supabase" : "local",
    migrationApplied,
    canAutoVerifyIdentity,
    canAssistMonitoring: true,
    requiresExternalProvider: !externalReady,
    checks,
    summary: canAutoVerifyIdentity
      ? "Le contrôle automatique d’identité est prêt. Toute décision défavorable reste révisable humainement."
      : "La surveillance comportementale locale est disponible, mais l’identité reste en revue humaine jusqu’à l’activation des services biométriques.",
  };
}
