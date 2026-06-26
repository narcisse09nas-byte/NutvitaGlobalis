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
    instructions: [
      "Redigez un rapport de supervision de niveau professionnel, directement exploitable par un programme de prise en charge de la malnutrition aigue.",
      "Le resume doit presenter le contexte, le score global, la dispersion des criteres, les forces, les faiblesses, les signaux critiques et les limites des donnees.",
      "Reliez explicitement les commentaires aux scores et expliquez les consequences possibles sur la qualite des soins, la continuite du traitement, la securite des patients et la disponibilite des intrants.",
      "Les recommandations doivent etre priorisees par urgence et impact, sans rester generiques.",
      "Le plan d action doit etre SMART: action concrete, responsable, echeance, preuve attendue, indicateur de suivi et modalite de verification.",
      "Utilisez des retours a la ligne dans recommendations et actionPlan afin que le rapport PDF reste lisible.",
    ].join(" "),
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
