'use server';

import { generateNutriTrackReport } from '@/nutritrack/ai/external-reporting';

export type NutriTrackProgramNarrative = {
  executiveSummary: string;
  keyFindings: string[];
  alerts: string[];
  dataLimitations: string[];
  recommendations: string[];
  actionPlan: string[];
  conclusion: string;
};

export async function generateProgramReport(input: {
  filters: Record<string, unknown>;
  reportData: Record<string, unknown>;
}): Promise<NutriTrackProgramNarrative> {
  const fallback = (): NutriTrackProgramNarrative => ({
    executiveSummary: 'Le rapport consolide les indicateurs communautaires, les programmes MAM, SAM et SAM avec complications ainsi que les supervisions pour le perimetre selectionne.',
    keyFindings: [
      'Les indicateurs doivent etre interpretes en tenant compte de la periode et des formations sanitaires selectionnees.',
      'Les tendances d admissions, de sorties et de performance permettent de prioriser les revues programmatiques.',
    ],
    alerts: ['Verifier en priorite les taux de deces, d abandon et les signaux de faible performance lorsqu ils sont renseignes.'],
    dataLimitations: ['Les conclusions restent dependantes de la completude, de la ponctualite et de la qualite des donnees saisies.'],
    recommendations: [
      'Confronter les indicateurs aux registres sources et documenter les valeurs atypiques.',
      'Elaborer un plan d amelioration pour chaque indicateur sous-performant.',
    ],
    actionPlan: [
      'Valider les donnees avec les responsables des formations sanitaires.',
      'Attribuer un responsable et une echeance a chaque action corrective.',
      'Reexaminer les indicateurs lors de la prochaine revue de performance.',
    ],
    conclusion: 'Le suivi regulier des tendances et la documentation des actions correctives renforceront la qualite de la prise en charge.',
  });

  const { value } = await generateNutriTrackReport<NutriTrackProgramNarrative>({
    reportType: 'nutritrack_program_report',
    instructions: [
      'Redigez un rapport institutionnel complet sur la prise en charge integree de la malnutrition aigue.',
      'Analysez chaque programme et les activites communautaires, puis comparez les niveaux de performance quand les donnees le permettent.',
      'Signalez les taux preoccupants, les incoherences possibles, les lacunes de couverture et les limites de qualite des donnees.',
      'Les recommandations doivent etre concretes, hierarchisees et applicables par une equipe de district ou de formation sanitaire.',
    ].join('\n'),
    input,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        executiveSummary: { type: 'string' },
        keyFindings: { type: 'array', items: { type: 'string' } },
        alerts: { type: 'array', items: { type: 'string' } },
        dataLimitations: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        actionPlan: { type: 'array', items: { type: 'string' } },
        conclusion: { type: 'string' },
      },
      required: ['executiveSummary', 'keyFindings', 'alerts', 'dataLimitations', 'recommendations', 'actionPlan', 'conclusion'],
    },
    fallback,
  });
  return value;
}
