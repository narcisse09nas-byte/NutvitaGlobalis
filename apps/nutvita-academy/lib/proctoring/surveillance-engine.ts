import type { ProctoringIncident } from "@/types/proctoring";

export type SurveillanceRisk = {
  score: number;
  level: "low" | "medium" | "high";
  reviewRequired: boolean;
  reasons: string[];
};

const SEVERITY_WEIGHT = { info: 2, warning: 10, critical: 35 } as const;

export function assessSurveillanceRisk(
  incidents: ProctoringIncident[],
): SurveillanceRisk {
  const score = Math.min(
    100,
    incidents.reduce(
      (total, incident) => total + SEVERITY_WEIGHT[incident.severity],
      0,
    ),
  );
  const criticalCount = incidents.filter(
    (incident) => incident.severity === "critical",
  ).length;
  const repeatedTabExits = incidents.filter(
    (incident) => incident.type === "tab_hidden",
  ).length;
  const identityAlert = incidents.some(
    (incident) => incident.type === "identity_change_suspected",
  );
  const reasons: string[] = [];

  if (criticalCount >= 2)
    reasons.push(`${criticalCount} incidents critiques détectés.`);
  if (repeatedTabExits >= 2)
    reasons.push(`${repeatedTabExits} sorties de l’onglet détectées.`);
  if (identityAlert) reasons.push("Un changement d’identité a été signalé.");

  return {
    score,
    level: score >= 70 ? "high" : score >= 30 ? "medium" : "low",
    reviewRequired: score >= 50 || criticalCount >= 2 || identityAlert,
    reasons,
  };
}
