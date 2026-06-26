"use server";

import { generateNutriTrackReport } from "@/nutritrack/ai/external-reporting";

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
  const fallback = () => {
    const groups = [
      sentence("Visites de routine", input.findingsRoutine),
      sentence("Suivis des evolutions defavorables", input.findingsPoorOutcome),
      sentence("Recherche des abandons", input.findingsDefaulter),
    ].filter(Boolean);
    const total = input.findingsRoutine.length + input.findingsPoorOutcome.length + input.findingsDefaulter.length;
    const priorities = [
      input.findingsDefaulter.length ? "Renforcer la recherche active et documenter les causes d abandon." : "",
      input.findingsPoorOutcome.length ? "Revoir rapidement les enfants avec evolution defavorable et les criteres de reference." : "",
      input.findingsRoutine.length ? "Consolider les constats recurrents des visites de routine dans le plan communautaire." : "",
    ].filter(Boolean);
    return {
      summary: total
        ? `${groups.join(" ")} Au total, ${total} constat(s) qualitatif(s) ont ete documentes. Priorites: ${priorities.join(" ")}`
        : "Aucun constat qualitatif n'a encore ete renseigne pour cette periode. La qualite du rapport reste limitee tant que les observations de terrain ne sont pas documentees.",
    };
  };
  const { value } = await generateNutriTrackReport<SummarizeHomeVisitsOutput>({
    reportType: "home_visits_summary",
    instructions: [
      "Analysez les constats de visites communautaires comme une note de coordination programme complete.",
      "Distinguez visites de routine, suivis d'evolution defavorable et recherche des abandons.",
      "Faites ressortir les tendances recurrentes, les signaux d'alerte, les causes probables, les hypotheses a verifier, les limites des donnees et les implications pour les ASC, la FOSA et le superviseur.",
      "Le champ summary doit etre structure en paragraphes consistants: constats majeurs, interpretation, risques, priorites operationnelles et prochaines actions.",
      "Evitez les phrases generiques; chaque recommandation doit etre reliee aux constats fournis.",
    ].join(" "),
    input,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { summary: { type: "string" } },
      required: ["summary"],
    },
    fallback,
  });
  return value;
}
