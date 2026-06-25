"use server";

export type SummarizeHomeVisitsInput = {
  findingsRoutine: string[];
  findingsPoorOutcome: string[];
  findingsDefaulter: string[];
};

export type SummarizeHomeVisitsOutput = { summary: string };

function sentence(label: string, findings: string[]) {
  const clean = findings.map(item => item.trim()).filter(Boolean);
  return clean.length ? `${label}: ${clean.slice(0, 3).join("; ")}.` : "";
}

export async function summarizeHomeVisits(input: SummarizeHomeVisitsInput): Promise<SummarizeHomeVisitsOutput> {
  const summary = [
    sentence("Visites de routine", input.findingsRoutine),
    sentence("Suivis des evolutions defavorables", input.findingsPoorOutcome),
    sentence("Recherche des abandons", input.findingsDefaulter),
  ].filter(Boolean).join(" ");
  return { summary: summary || "Aucun constat qualitatif n'a encore ete renseigne pour cette periode." };
}
