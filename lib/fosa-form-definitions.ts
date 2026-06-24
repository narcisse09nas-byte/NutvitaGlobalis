export type FosaField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "time" | "textarea" | "select" | "checkboxes";
  required?: boolean;
  options?: string[];
  step?: string;
  min?: number;
  placeholder?: string;
  help?: string;
  showWhen?: { field: string; values: string[] };
};

export type FosaFormSection = { title: string; description?: string; fields: FosaField[] };
export type FosaFormDefinition = { titleField: string; referencePrefix: string; sections: FosaFormSection[] };

const yesNo = ["Non", "Oui"];
const clinicalFields: FosaField[] = [
  { name: "diarrhea_dehydration", label: "Diarrhee ou deshydratation", type: "select", options: yesNo },
  { name: "severe_vomiting", label: "Vomissements severes", type: "select", options: yesNo },
  { name: "pneumonia", label: "Pneumonie", type: "select", options: yesNo },
  { name: "subcostal_retraction", label: "Tirage sous-costal", type: "select", options: yesNo },
  { name: "open_skin_lesions", label: "Lesions cutanees ouvertes", type: "select", options: yesNo },
  { name: "hypothermia", label: "Hypothermie", type: "select", options: yesNo },
  { name: "fever", label: "Fievre", type: "select", options: yesNo },
  { name: "extreme_pallor", label: "Paleur extreme", type: "select", options: yesNo },
  { name: "weak_apathetic_unconscious", label: "Faiblesse, apathie ou inconscience", type: "select", options: yesNo },
  { name: "seizures_measles", label: "Convulsions, rougeole ou autre complication", type: "select", options: yesNo },
  { name: "vitamin_a_deficiency", label: "Signes de carence en vitamine A", type: "select", options: yesNo },
  { name: "iv_or_ngt", label: "Perfusion ou alimentation par sonde", type: "select", options: yesNo },
];

export const fosaFormDefinitions: Record<string, FosaFormDefinition> = {
  admissions: {
    titleField: "child_name",
    referencePrefix: "ADM",
    sections: [
      { title: "Identite de l'enfant", fields: [
        { name: "child_name", label: "Nom complet de l'enfant", required: true },
        { name: "caretaker_name", label: "Nom du parent ou accompagnant", required: true },
        { name: "caretaker_phone", label: "Telephone du parent ou accompagnant" },
        { name: "age_months", label: "Age en mois", type: "number", required: true, min: 0 },
        { name: "sex", label: "Sexe", type: "select", required: true, options: ["Masculin", "Feminin"] },
        { name: "village", label: "Village ou quartier", required: true },
        { name: "community_worker", label: "Agent communautaire referent" },
      ]},
      { title: "Admission et anthropometrie", fields: [
        { name: "admission_date", label: "Date d'admission", type: "date", required: true },
        { name: "admission_type", label: "Type d'admission", type: "select", required: true, options: ["Nouveau cas", "Rechute", "Ex-MAS", "Readmission avant 2 mois", "Transfert interne", "Nouveau selon P/T ou PB", "Nouveau avec oedemes"] },
        { name: "weight_kg", label: "Poids (kg)", type: "number", required: true, step: "0.01", min: 0 },
        { name: "height_cm", label: "Taille (cm)", type: "number", required: true, step: "0.1", min: 0 },
        { name: "muac_mm", label: "Perimetre brachial PB/MUAC (mm)", type: "number", required: true, min: 0 },
        { name: "oedema", label: "Oedemes bilateraux", type: "select", required: true, options: yesNo },
        { name: "oedema_grade", label: "Grade des oedemes", type: "select", options: ["1", "2", "3"], showWhen: { field: "oedema", values: ["Oui"] } },
        { name: "appetite_test", label: "Test de l'appetit", type: "select", options: ["Non realise", "Reussi", "Echoue"] },
        { name: "whz", label: "Z-score poids/taille", type: "number", step: "0.01" },
        { name: "waz", label: "Z-score poids/age", type: "number", step: "0.01" },
        { name: "haz", label: "Z-score taille/age", type: "number", step: "0.01" },
        { name: "diagnosis", label: "Diagnostic nutritionnel", type: "select", options: ["Non malnutri", "MAM", "SAM"] },
        { name: "program", label: "Programme d'orientation", type: "select", options: ["TSFP", "OTP", "ITP", "Reference externe"] },
      ]},
      { title: "Evaluation clinique", description: "Renseigner les signes de complication observes a l'admission.", fields: clinicalFields },
      { title: "Decision", fields: [
        { name: "decision", label: "Decision prise", type: "select", required: true, options: ["Admis", "Reference", "Non eligible", "Observation"] },
        { name: "referral_facility", label: "Formation sanitaire de reference", showWhen: { field: "decision", values: ["Reference"] } },
        { name: "referral_reason", label: "Motif de reference", type: "textarea", showWhen: { field: "decision", values: ["Reference"] } },
        { name: "notes", label: "Observations", type: "textarea" },
      ]},
    ],
  },
  children: {
    titleField: "child_name",
    referencePrefix: "VIS",
    sections: [
      { title: "Enfant et visite", fields: [
        { name: "child_code", label: "Code de l'enfant", required: true },
        { name: "child_name", label: "Nom complet de l'enfant", required: true },
        { name: "visit_date", label: "Date de visite", type: "date", required: true },
        { name: "visit_number", label: "Numero de visite", type: "number", required: true, min: 0 },
        { name: "treatment_mode", label: "Mode de suivi", type: "select", required: true, options: ["Ambulatoire", "Hospitalier"] },
        { name: "treatment_phase", label: "Phase hospitaliere", type: "select", options: ["Phase 1", "Transition", "Phase 2"], showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
      ]},
      { title: "Mesures et etat clinique", fields: [
        { name: "weight_kg", label: "Poids (kg)", type: "number", required: true, step: "0.01" },
        { name: "height_cm", label: "Taille (cm)", type: "number", step: "0.1" },
        { name: "muac_mm", label: "PB/MUAC (mm)", type: "number" },
        { name: "oedema", label: "Oedemes", type: "select", options: yesNo },
        { name: "oedema_grade", label: "Grade des oedemes", type: "select", options: ["1", "2", "3"], showWhen: { field: "oedema", values: ["Oui"] } },
        { name: "appetite_test", label: "Test de l'appetit", type: "select", options: ["Non realise", "Reussi", "Echoue"] },
        { name: "temperature_morning", label: "Temperature matin", type: "number", step: "0.1", showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
        { name: "temperature_evening", label: "Temperature soir", type: "number", step: "0.1", showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
        { name: "respiration_morning", label: "Frequence respiratoire matin", type: "number", showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
        { name: "respiration_evening", label: "Frequence respiratoire soir", type: "number", showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
        ...clinicalFields,
      ]},
      { title: "Traitement et suivi", fields: [
        { name: "nutritional_treatments", label: "Traitements nutritionnels, lots et quantites", type: "textarea", placeholder: "Ex. RUTF, lot 2026-04, 14 sachets" },
        { name: "systematic_treatments", label: "Traitements systematiques", type: "textarea" },
        { name: "therapeutic_feeding", label: "Alimentation therapeutique et repas", type: "textarea", showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
        { name: "medications", label: "Medicaments, doses, voies et frequences", type: "textarea", showWhen: { field: "treatment_mode", values: ["Hospitalier"] } },
        { name: "home_visit_done", label: "Visite a domicile realisee", type: "select", options: yesNo },
        { name: "home_visit_observations", label: "Observations de la visite a domicile", type: "textarea", showWhen: { field: "home_visit_done", values: ["Oui"] } },
        { name: "sensitization_topic", label: "Theme de sensibilisation" },
        { name: "next_visit_date", label: "Prochaine visite", type: "date" },
        { name: "outcome", label: "Issue ou decision", type: "select", options: ["Poursuite du suivi", "Gueri", "Traite avec succes", "Abandon", "Deces", "Non repondant", "Reference medicale", "Transfert"] },
        { name: "notes", label: "Notes cliniques", type: "textarea" },
      ]},
    ],
  },
  vaccination: {
    titleField: "child_name", referencePrefix: "VAC", sections: [
      { title: "Enfant", fields: [
        { name: "child_code", label: "Code de l'enfant", required: true },
        { name: "child_name", label: "Nom complet de l'enfant", required: true },
        { name: "assessment_date", label: "Date de l'evaluation", type: "date", required: true },
      ]},
      { title: "Vaccination", description: "Indiquer le statut et la date connue pour chaque antigene.", fields: [
        { name: "bcg", label: "BCG", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "opv", label: "Polio oral", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "penta", label: "Pentavalent", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "pcv", label: "Pneumocoque", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "rota", label: "Rotavirus", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "measles_rubella", label: "Rougeole-Rubeole", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "yellow_fever", label: "Fievre jaune", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "vitamin_a", label: "Vitamine A", type: "select", options: ["Oui", "Non", "Inconnu"] },
        { name: "notes", label: "Observations et doses manquantes", type: "textarea" },
      ]},
    ],
  },
  referrals: {
    titleField: "child_name", referencePrefix: "REF", sections: [
      { title: "Reference", fields: [
        { name: "direction", label: "Type", type: "select", required: true, options: ["Entrante", "Sortante"] },
        { name: "child_code", label: "Code de l'enfant" },
        { name: "child_name", label: "Nom complet de l'enfant", required: true },
        { name: "referral_date", label: "Date de reference", type: "date", required: true },
        { name: "origin_facility", label: "FOSA d'origine", required: true },
        { name: "destination_facility", label: "FOSA de destination", required: true },
        { name: "reason", label: "Motif de reference", type: "textarea", required: true },
        { name: "status", label: "Statut de la reference", type: "select", required: true, options: ["En attente", "Acceptee", "Refusee", "Arrivee", "Non arrivee"] },
        { name: "status_date", label: "Date de mise a jour", type: "date" },
        { name: "decline_reason", label: "Motif du refus", type: "textarea", showWhen: { field: "status", values: ["Refusee"] } },
        { name: "notes", label: "Observations", type: "textarea" },
      ]},
    ],
  },
  "special-attention": {
    titleField: "child_name", referencePrefix: "ALT", sections: [
      { title: "Dossier sous attention speciale", fields: [
        { name: "child_code", label: "Code de l'enfant", required: true },
        { name: "child_name", label: "Nom complet de l'enfant", required: true },
        { name: "alert_date", label: "Date du signalement", type: "date", required: true },
        { name: "alert_type", label: "Type d'alerte", type: "select", required: true, options: ["Absence au rendez-vous", "Evolution defavorable", "Perte de poids", "Complication clinique", "Risque d'abandon", "Visite a domicile requise", "Autre"] },
        { name: "severity", label: "Niveau de priorite", type: "select", required: true, options: ["Faible", "Modere", "Eleve", "Urgent"] },
        { name: "community_worker", label: "Agent communautaire charge du suivi" },
        { name: "planned_visit_date", label: "Date de visite planifiee", type: "date" },
        { name: "reason", label: "Motif et signes observes", type: "textarea", required: true },
        { name: "action_taken", label: "Action entreprise", type: "textarea" },
        { name: "outcome", label: "Resultat du suivi", type: "textarea" },
      ]},
    ],
  },
  stock: {
    titleField: "commodity_name", referencePrefix: "STK", sections: [
      { title: "Mouvement de stock", fields: [
        { name: "movement_date", label: "Date", type: "date", required: true },
        { name: "commodity_name", label: "Produit ou intrant", required: true },
        { name: "movement_type", label: "Type de mouvement", type: "select", required: true, options: ["Reception", "Utilisation", "Transfert", "Perte ou avarie"] },
        { name: "quantity", label: "Quantite", type: "number", required: true, step: "0.01", min: 0 },
        { name: "unit", label: "Unite", type: "select", required: true, options: ["kg", "sachet", "comprime", "unite", "tonne", "ml"] },
        { name: "batch_number", label: "Numero de lot", required: true },
        { name: "program", label: "Programme", type: "select", options: ["MAM", "SAM", "SAM+", "Tous"] },
        { name: "source", label: "Source", type: "select", options: ["PAM", "UNICEF", "DRSP", "Transfert interne", "Autre"] },
        { name: "source_other", label: "Autre source", showWhen: { field: "source", values: ["Autre"] } },
        { name: "destination", label: "Destination du transfert", showWhen: { field: "movement_type", values: ["Transfert"] } },
        { name: "expiry_date", label: "Date d'expiration", type: "date" },
        { name: "notes", label: "Observations", type: "textarea" },
      ]},
    ],
  },
  supervision: {
    titleField: "supervisor_name", referencePrefix: "SUP", sections: [
      { title: "Mission", fields: [
        { name: "supervision_date", label: "Date de supervision", type: "date", required: true },
        { name: "supervisor_name", label: "Nom du superviseur", required: true },
        { name: "supervisor_sex", label: "Sexe", type: "select", options: ["Masculin", "Feminin"] },
        { name: "supervisor_function", label: "Fonction", required: true },
        { name: "component", label: "Composante", type: "select", required: true, options: ["Ambulatoire", "Hospitaliere", "Communautaire"] },
      ]},
      { title: "Evaluation", fields: [
        { name: "organization_score", label: "Organisation du service (%)", type: "number", min: 0 },
        { name: "screening_score", label: "Depistage et admission (%)", type: "number", min: 0 },
        { name: "treatment_score", label: "Prise en charge et traitement (%)", type: "number", min: 0 },
        { name: "stock_score", label: "Gestion des stocks (%)", type: "number", min: 0 },
        { name: "reporting_score", label: "Donnees et rapportage (%)", type: "number", min: 0 },
        { name: "checklist", label: "Constats detailles de la checklist", type: "textarea", required: true },
        { name: "summary", label: "Resume de la supervision", type: "textarea" },
        { name: "recommendations", label: "Recommandations", type: "textarea", required: true },
        { name: "action_plan", label: "Plan d'action, responsable et echeance", type: "textarea", required: true },
      ]},
    ],
  },
  "community-activities": {
    titleField: "activity_type", referencePrefix: "COM", sections: [
      { title: "Activite", fields: [
        { name: "activity_date", label: "Date", type: "date", required: true },
        { name: "activity_type", label: "Type d'activite", type: "select", required: true, options: ["Depistage communautaire", "Groupe de discussion", "Conseil individuel", "Visite a domicile", "Demonstration culinaire"] },
        { name: "community_worker", label: "Agent communautaire", required: true },
        { name: "village", label: "Village ou quartier", required: true },
      ]},
      { title: "Resultats", fields: [
        { name: "children_screened", label: "Enfants depistes", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Depistage communautaire"] } },
        { name: "sam_cases", label: "Cas SAM detectes", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Depistage communautaire"] } },
        { name: "mam_cases", label: "Cas MAM detectes", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Depistage communautaire"] } },
        { name: "topic", label: "Theme", showWhen: { field: "activity_type", values: ["Groupe de discussion", "Conseil individuel", "Demonstration culinaire"] } },
        { name: "participants_male", label: "Participants hommes/garcons", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Groupe de discussion", "Conseil individuel", "Demonstration culinaire"] } },
        { name: "participants_female", label: "Participantes femmes/filles", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Groupe de discussion", "Conseil individuel", "Demonstration culinaire"] } },
        { name: "routine_visits", label: "Visites de routine", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Visite a domicile"] } },
        { name: "poor_outcome_visits", label: "Visites pour evolution defavorable", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Visite a domicile"] } },
        { name: "defaulter_tracing", label: "Recherche des abandons", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Visite a domicile"] } },
        { name: "mam_children_reached", label: "Enfants MAM atteints", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Visite a domicile"] } },
        { name: "sam_children_reached", label: "Enfants SAM atteints", type: "number", min: 0, showWhen: { field: "activity_type", values: ["Visite a domicile"] } },
        { name: "findings", label: "Constats et observations", type: "textarea" },
      ]},
    ],
  },
  "community-mapping": {
    titleField: "village_name", referencePrefix: "VIL", sections: [
      { title: "Village ou quartier", fields: [
        { name: "village_name", label: "Nom", required: true },
        { name: "village_code", label: "Code unique" },
        { name: "region", label: "Region", required: true },
        { name: "health_district", label: "District de sante", required: true },
        { name: "health_area", label: "Aire de sante", required: true },
        { name: "estimated_population", label: "Population estimee", type: "number", min: 0 },
        { name: "community_worker_count", label: "Nombre d'agents communautaires", type: "number", min: 0 },
        { name: "latitude", label: "Latitude", type: "number", step: "0.000001" },
        { name: "longitude", label: "Longitude", type: "number", step: "0.000001" },
        { name: "notes", label: "Observations", type: "textarea" },
      ]},
    ],
  },
  chws: {
    titleField: "full_name", referencePrefix: "ASC", sections: [
      { title: "Agent communautaire", fields: [
        { name: "full_name", label: "Nom complet", required: true },
        { name: "sex", label: "Sexe", type: "select", required: true, options: ["Masculin", "Feminin"] },
        { name: "phone", label: "Telephone", required: true },
        { name: "email", label: "Email" },
        { name: "village", label: "Village couvert", required: true },
        { name: "health_area", label: "Aire de sante", required: true },
        { name: "start_date", label: "Date de debut", type: "date" },
        { name: "status", label: "Statut", type: "select", options: ["Actif", "Suspendu", "Inactif"] },
        { name: "training", label: "Formations recues", type: "textarea" },
      ]},
    ],
  },
  commodities: {
    titleField: "commodity_name", referencePrefix: "PRO", sections: [
      { title: "Produit ou intrant", fields: [
        { name: "commodity_name", label: "Nom", required: true },
        { name: "commodity_type", label: "Type", type: "select", required: true, options: ["Nutritionnel", "Traitement systematique"] },
        { name: "unit", label: "Unite", type: "select", required: true, options: ["kg", "sachet", "comprime", "unite", "tonne", "ml"] },
        { name: "program", label: "Programme", type: "select", required: true, options: ["MAM", "SAM", "SAM+", "Tous"] },
        { name: "minimum_stock", label: "Seuil minimal", type: "number", min: 0 },
        { name: "active", label: "Statut", type: "select", options: ["Actif", "Inactif"] },
      ]},
    ],
  },
};

export function getFosaFormDefinition(slug: string) {
  return fosaFormDefinitions[slug] || null;
}
