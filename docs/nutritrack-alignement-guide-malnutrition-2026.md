# Alignement NutriTrack avec le guide OMS/UNICEF 2026

Document examine : *Implementation guidance on the management of wasting and nutritional oedema (acute malnutrition) in infants and children aged under 5 years in inpatient and outpatient settings*, OMS/UNICEF, 2026, 254 pages.

## Conclusion

NutriTrack couvre deja une part importante du parcours des enfants de 6 a 59 mois : anthropometrie, PB/MUAC, poids-pour-taille, oedeme bilateral et grade, test d appetit, complications, orientation ambulatoire/hospitaliere, suivi, references, sorties, vaccination, traitements, stocks, ASC, activites communautaires et supervision.

L application ne doit toutefois pas encore etre presentee comme totalement alignee au guide 2026. Les principaux ecarts concernent les nourrissons de moins de 6 mois, l evaluation approfondie, la mere ou l aidant, l alimentation, la stimulation psychosociale et la formalisation des criteres de reponse et de sortie.

## Couverture actuelle

| Domaine | Etat | Observation |
| --- | --- | --- |
| Identification SAM/MAM 6-59 mois | Couvert | PB/MUAC, poids-pour-taille et oedeme sont utilises. |
| Test d appetit | Couvert | Disponible a l admission et au suivi. |
| Complications et reference | Couvert | Les signes de danger principaux influencent l orientation. |
| Prise en charge ambulatoire | Couvert partiellement | Suivi, produits, traitements, visites a domicile et sorties sont presents. |
| Prise en charge hospitaliere | Couvert partiellement | Phases, alimentation therapeutique, complications et medicaments sont suivis. |
| Vaccination et traitements systematiques | Couvert partiellement | Les donnees sont saisies, mais les protocoles 2026 ne sont pas encore transformes en controles explicites. |
| Activites communautaires et ASC | Couvert | Depistage, sensibilisation, visites et cartographie sont disponibles. |
| Stocks | Couvert | Mouvements, lots, disponibilite et consommation sont suivis. |
| Supervision | Couvert | Listes de controle, scores, recommandations et plan d action. |
| Nourrissons de moins de 6 mois | Insuffisant | Le formulaire actuel exige les indicateurs et le parcours concus surtout pour les 6-59 mois. |
| Mere ou aidant | Insuffisant | Pas d evaluation structuree de la sante, nutrition, sante mentale et vulnerabilites de l aidant. |
| Evaluation de l alimentation | Insuffisant | Pas de module complet allaitement, observation de tetee et alimentation de remplacement. |
| Stimulation psychosociale | Insuffisant | Pas de plan ni de suivi structure. |
| Reponse insuffisante | Partiel | Le statut existe, mais sans moteur explicite de criteres, causes et actions. |
| Handicap et adaptation des mesures | Insuffisant | Pas de parcours ni d aide specifique pour les mesures et l interpretation. |

## Ajustements prioritaires

### Priorite 1 - Securite clinique

1. Ajouter un parcours distinct `0-5 mois` avec identification du risque de mauvaise croissance et developpement.
2. Ajouter le triage d urgence, l evaluation approfondie et une justification obligatoire de l orientation.
3. Transformer les criteres d admission, de passage de phase, de mauvaise reponse et de sortie en regles versionnees et auditables.
4. Ajouter une liste de controle a chaque visite ambulatoire et hospitaliere.
5. Valider les tables de posologie, F-75, F-100, ATPE/RUTF et traitements systematiques avec le protocole national avant automatisation.

### Priorite 2 - Nourrisson et aidant

1. Evaluation complete de l alimentation : allaitement, observation de tetee, expression, alimentation a la tasse et alimentation de remplacement.
2. Evaluation de la mere ou de l aidant : sante physique, etat nutritionnel, sante mentale, protection et facteurs socioeconomiques.
3. Plan de soutien individualise, actions, responsable, echeance et resultat.
4. Evaluation de la vitesse de croissance et de la trajectoire ponderale, pas uniquement d une valeur ponctuelle.

### Priorite 3 - Qualite du programme

1. Ajouter la stimulation psychosociale aux plans de soins hospitaliers et ambulatoires.
2. Ajouter depistage et suivi documente du VIH, de la tuberculose, du paludisme selon le contexte et des autres investigations.
3. Ajouter les adaptations pour handicap ou difficulte de mesure.
4. Produire des indicateurs de couverture, continuite, abandon, non-reponse, reference aboutie, qualite des donnees et disponibilite des intrants.
5. Conserver la version du protocole appliquee a chaque decision clinique.

## Regles pour l IA

- Les calculs, seuils, alertes et orientations restent deterministes et versionnes.
- L IA externe redige, explique les tendances et propose un plan d action; elle ne remplace pas les criteres cliniques.
- Aucune identite d enfant ou d aidant ne doit etre envoyee au fournisseur externe.
- Les sorties doivent mentionner les donnees manquantes, les limites et la necessite de validation professionnelle.
- Toute recommandation clinique automatisee doit pouvoir etre retracee jusqu aux donnees et a la version du protocole.

## Sections du guide utilisees

- Sections 2 et 3 : identification, reference, evaluation, test d appetit et evaluation approfondie.
- Sections 4 a 6 : prise en charge hospitaliere, phases, reponse et sortie.
- Sections 7 a 9 : prise en charge ambulatoire et nourrissons de moins de 6 mois.
- Sections 10 a 12 : stimulation psychosociale, ASC, mere et aidant.
- Annexes : anthropometrie, oedeme, PB/MUAC, appetit, admission, sortie, traitements et alimentation therapeutique.
