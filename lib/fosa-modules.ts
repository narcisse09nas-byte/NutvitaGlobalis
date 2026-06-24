export const fosaModules = [
  { slug: "admissions", title: "Admissions", description: "Enregistrer les admissions nutritionnelles et les donnees anthropometriques." },
  { slug: "children", title: "Registre des enfants", description: "Suivre les enfants, visites, traitements et sorties." },
  { slug: "vaccination", title: "Vaccination", description: "Documenter le statut vaccinal et les doses manquantes de chaque enfant." },
  { slug: "referrals", title: "Referencements", description: "Gerer les references entrantes et sortantes entre formations sanitaires." },
  { slug: "special-attention", title: "Attention speciale", description: "Identifier les dossiers qui necessitent une surveillance renforcee." },
  { slug: "stock", title: "Stocks nutritionnels", description: "Suivre les intrants, lots, mouvements et disponibilites." },
  { slug: "supervision", title: "Supervision", description: "Documenter les supervisions, constats et plans d'action." },
  { slug: "community-activities", title: "Activites communautaires", description: "Tracer les activites communautaires et les visites a domicile." },
  { slug: "health-facilities", title: "Formations sanitaires", description: "Configurer les FOSA, districts, aires de sante et programmes." },
  { slug: "community-mapping", title: "Cartographie communautaire", description: "Organiser villages, zones de couverture et agents communautaires." },
  { slug: "chws", title: "Agents communautaires", description: "Gerer les relais et agents de sante communautaire." },
  { slug: "commodities", title: "Produits et intrants", description: "Configurer les produits therapeutiques et consommables." },
  { slug: "reports", title: "Rapports", description: "Produire les indicateurs de programme et rapports consolides." },
] as const;

export function getFosaModule(slug: string) {
  return fosaModules.find(module => module.slug === slug);
}
