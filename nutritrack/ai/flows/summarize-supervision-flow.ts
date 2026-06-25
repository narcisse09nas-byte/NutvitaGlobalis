"use server";

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
  const scored = input.checklist.filter(item => Number.isFinite(item.status));
  const average = scored.length ? scored.reduce((total, item) => total + item.status, 0) / scored.length : 0;
  const weaknesses = [...scored].sort((a, b) => a.status - b.status).slice(0, 3);
  const strengths = [...scored].sort((a, b) => b.status - a.status).slice(0, 2);
  const summary = `La supervision de la composante ${input.component} a ${input.facilityName} presente un score moyen de ${average.toFixed(1)}/5. ${strengths.length ? `Les principaux acquis concernent ${strengths.map(item => item.item).join(" et ")}.` : ""} ${weaknesses.length ? `Les points prioritaires sont ${weaknesses.map(item => item.item).join(", ")}.` : ""}`.trim();
  const recommendations = weaknesses.length
    ? weaknesses.map(item => `- Renforcer ${item.item.toLowerCase()}${item.comments ? ` (${item.comments})` : ""}.`).join("\n")
    : "- Maintenir les acquis et poursuivre la supervision reguliere.";
  const actionPlan = weaknesses.length
    ? weaknesses.map((item, index) => `- Action ${index + 1}: corriger ${item.item.toLowerCase()} sous la responsabilite du responsable de la FOSA, avant la prochaine supervision.`).join("\n")
    : "- Documenter les bonnes pratiques et les partager avec l'equipe avant la prochaine supervision.";
  return { summary, recommendations, actionPlan };
}
