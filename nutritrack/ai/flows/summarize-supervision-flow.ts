"use server";

import { generateNutriTrackReport } from "@/nutritrack/ai/external-reporting";

export type SummarizeSupervisionInput = {
  checklist: Array<{ item: string; status: number; comments?: string }>;
  supervisorName: string;
  supervisorFunction: string;
  facilityName: string;
  component: "outpatient" | "inpatient" | "community";
};

export type SummarizeSupervisionOutput = {
  summary: string;
  recommendations: string;
  actionPlan: string;
};

export async function summarizeSupervision(input: SummarizeSupervisionInput): Promise<SummarizeSupervisionOutput> {
  const fallback = () => {
    const scored = input.checklist.filter(item => Number.isFinite(item.status));
    const average = scored.length ? scored.reduce((total, item) => total + item.status, 0) / scored.length : 0;
    const weaknesses = [...scored].sort((a, b) => a.status - b.status).slice(0, 5);
    const strengths = [...scored].sort((a, b) => b.status - a.status).slice(0, 3);
    const comments = scored.filter(item => item.comments?.trim()).map(item => `${item.item}: ${item.comments}`).slice(0, 4);
    const summary = [
      `La supervision de la composante ${input.component} a ${input.facilityName} couvre ${scored.length} critere(s) et presente un score moyen de ${average.toFixed(1)}/5.`,
      strengths.length ? `Acquis principaux: ${strengths.map(item => `${item.item} (${item.status}/5)`).join(", ")}.` : "",
      weaknesses.length ? `Ecarts prioritaires: ${weaknesses.map(item => `${item.item} (${item.status}/5)`).join(", ")}.` : "",
      comments.length ? `Elements qualitatifs documentes: ${comments.join("; ")}.` : "Les commentaires qualitatifs sont insuffisants pour expliquer completement les scores.",
    ].filter(Boolean).join(" ");
    const recommendations = weaknesses.length
      ? weaknesses.map((item, index) => `${index + 1}. Renforcer ${item.item.toLowerCase()}${item.comments ? ` en tenant compte de: ${item.comments}` : ""}.`).join("\n")
      : "1. Maintenir les acquis.\n2. Documenter les bonnes pratiques.\n3. Programmer une supervision de suivi.";
    const actionPlan = weaknesses.length
      ? weaknesses.map((item, index) => `${index + 1}. Action: corriger ${item.item.toLowerCase()}; responsable: chef de la FOSA et referent nutrition; echeance: avant la prochaine supervision; preuve: document ou observation de conformite.`).join("\n")
      : "1. Partager les acquis avec l equipe avant la prochaine supervision et conserver les preuves de conformite.";
    return { summary, recommendations, actionPlan };
  };
  const { value } = await generateNutriTrackReport<SummarizeSupervisionOutput>({
    reportType: "supervision_report",
    instructions: "Redigez un rapport de supervision complet. Analysez le score global et la dispersion des criteres, reliez les commentaires aux scores, identifiez les risques pour la qualite des soins, puis proposez des recommandations priorisees et un plan d action SMART avec responsables, echeances et moyens de verification. Utilisez des retours a la ligne dans recommendations et actionPlan.",
    input,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        recommendations: { type: "string" },
        actionPlan: { type: "string" },
      },
      required: ["summary", "recommendations", "actionPlan"],
    },
    fallback,
  });
  return value;
}
