import type { BillingPlan } from "@/types/billing";

export const billingPlans: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Découverte de l’académie.",
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    features: [
      "Accès aux contenus gratuits",
      "Suivi de progression local",
      "Bibliothèque limitée",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    description: "Pour les apprenants individuels.",
    monthlyPriceUsd: 9,
    annualPriceUsd: 90,
    features: [
      "Accès aux formations Standard",
      "Quiz et examens",
      "Certificats numériques",
      "IA Instructor locale",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "Pour les professionnels et formateurs.",
    monthlyPriceUsd: 19,
    annualPriceUsd: 190,
    recommended: true,
    features: [
      "Toutes les formations",
      "Instructor Studio",
      "Rapports avancés",
      "IA Instructor Pro",
      "Certificats premium",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Pour ONG, entreprises et institutions.",
    monthlyPriceUsd: 99,
    annualPriceUsd: 990,
    features: [
      "Gestion des cohortes",
      "Administration avancée",
      "Rapports organisationnels",
      "Support prioritaire",
      "Configuration personnalisée",
    ],
  },
];
