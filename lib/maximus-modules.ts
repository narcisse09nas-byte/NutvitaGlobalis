export type MaximusField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select';
  options?: string[];
  optionSource?: 'countries' | 'states' | 'centralKitchens' | 'salePoints' | 'ingredients' | 'budgetLines' | 'staff' | 'vendors' | 'assets' | 'menus';
  dependsOn?: string;
  required?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
};

export type MaximusModule = {
  slug: string;
  title: string;
  group: string;
  description: string;
  fields: MaximusField[];
  registryColumns?: string[];
  specializedForm?: 'budgetLines';
};

const commonStatus = ['draft', 'submitted', 'validated', 'rejected', 'archived'];

const baseMaximusModules: MaximusModule[] = [
  { slug: 'menus', title: 'Menus', group: 'Restauration', description: 'Menus, portions, ingrédients et processus de préparation.', fields: [
    { key: 'name', label: 'Nom du menu', required: true }, { key: 'menu_type', label: 'Type de menu', type: 'select', options: ['Standard', 'Diététique', 'Enfant', 'Événementiel', 'Autre'] },
    { key: 'meal_type', label: 'Repas', type: 'select', options: ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation'] }, { key: 'servings', label: 'Nombre de portions', type: 'number' },
    { key: 'description', label: 'Description', type: 'textarea' }, { key: 'ingredients', label: 'Ingrédients et quantités', type: 'textarea' }, { key: 'cooking_process', label: 'Processus de cuisson', type: 'textarea' },
  ] },
  { slug: 'sales/sale-points', title: 'Points de vente', group: 'Ventes', description: 'Restaurants, kiosques et autres points de distribution.', fields: [
    { key: 'name', label: 'Nom du point de vente', required: true }, { key: 'manager_name', label: 'Responsable', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['Restaurant', 'Kiosque', 'Cantine', 'Partenaire', 'Autre'] },
    { key: 'staff_count', label: 'Nombre de personnes', type: 'number' }, { key: 'central_kitchen', label: 'Cuisine centrale rattachée' }, { key: 'address', label: 'Adresse' },
  ] },
  { slug: 'sales/partner-stock', title: 'Stocks des points de vente', group: 'Ventes', description: 'Disponibilités, entrées, sorties et seuils par point de vente.', fields: [
    { key: 'sale_point', label: 'Point de vente', required: true }, { key: 'item', label: 'Article / ingrédient', required: true }, { key: 'quantity', label: 'Quantité', type: 'number', required: true },
    { key: 'unit', label: 'Unité' }, { key: 'movement_type', label: 'Mouvement', type: 'select', options: ['Entrée', 'Sortie', 'Ajustement', 'Perte'] }, { key: 'movement_date', label: 'Date', type: 'date' },
  ] },
  { slug: 'sales/daily-orders', title: 'Commandes journalières', group: 'Ventes', description: 'Commandes de repas et besoins spécifiques des points de vente.', fields: [
    { key: 'sale_point', label: 'Point de vente', required: true }, { key: 'central_kitchen', label: 'Cuisine centrale' }, { key: 'order_date', label: 'Date de commande', type: 'date', required: true },
    { key: 'menus', label: 'Menus et quantités', type: 'textarea', required: true }, { key: 'specific_ingredients', label: 'Ingrédients spécifiques', type: 'textarea' }, { key: 'notes', label: 'Observations', type: 'textarea' },
  ] },
  { slug: 'sales/delivery-register', title: 'Registre des livraisons', group: 'Ventes', description: 'Bordereaux, quantités livrées, réception et écarts.', fields: [
    { key: 'reference', label: 'Référence', required: true }, { key: 'sale_point', label: 'Point de vente', required: true }, { key: 'delivery_date', label: 'Date de livraison', type: 'date' },
    { key: 'items', label: 'Articles et quantités', type: 'textarea' }, { key: 'delivered_by', label: 'Livreur' }, { key: 'received_by', label: 'Réceptionnaire' }, { key: 'discrepancies', label: 'Écarts constatés', type: 'textarea' },
  ] },
  { slug: 'sales/reports', title: 'Rapports de vente', group: 'Ventes', description: 'Ventes, invendus, retours et recettes journalières.', fields: [
    { key: 'sale_point', label: 'Point de vente', required: true }, { key: 'report_date', label: 'Date du rapport', type: 'date', required: true }, { key: 'gross_sales', label: 'Ventes brutes', type: 'number' },
    { key: 'cash_sales', label: 'Ventes espèces', type: 'number' }, { key: 'digital_sales', label: 'Ventes digitales', type: 'number' }, { key: 'unsold_items', label: 'Invendus / retours', type: 'textarea' }, { key: 'comment', label: 'Commentaire', type: 'textarea' },
  ] },
  { slug: 'supply/ingredients', title: 'Ingrédients', group: 'Approvisionnement et stock', description: 'Catalogue des matières premières et prix de référence.', fields: [
    { key: 'name', label: 'Ingrédient', required: true }, { key: 'category', label: 'Catégorie' }, { key: 'unit', label: 'Unité', required: true }, { key: 'unit_price', label: 'Prix unitaire', type: 'number' },
    { key: 'minimum_stock', label: 'Seuil minimal', type: 'number' }, { key: 'budget_line', label: 'Ligne budgétaire' }, { key: 'supplier', label: 'Fournisseur principal' },
  ] },
  { slug: 'supply/consolidated-needs', title: 'Besoins consolidés', group: 'Approvisionnement et stock', description: 'Consolidation hebdomadaire des besoins des cuisines.', fields: [
    { key: 'period_start', label: 'Début de période', type: 'date' }, { key: 'period_end', label: 'Fin de période', type: 'date' }, { key: 'central_kitchen', label: 'Cuisine centrale' },
    { key: 'needs', label: 'Besoins consolidés', type: 'textarea', required: true }, { key: 'estimated_cost', label: 'Coût estimé', type: 'number' },
  ] },
  { slug: 'supply/cost-estimation', title: 'Estimation des coûts', group: 'Approvisionnement et stock', description: 'Valorisation des besoins et préparation des demandes financières.', fields: [
    { key: 'title', label: 'Objet', required: true }, { key: 'central_kitchen', label: 'Cuisine centrale' }, { key: 'period', label: 'Période' }, { key: 'items', label: 'Détail des articles', type: 'textarea' },
    { key: 'total_amount', label: 'Montant total', type: 'number', required: true }, { key: 'budget_line', label: 'Ligne budgétaire' },
  ] },
  { slug: 'supply/central-stock', title: 'Stock central', group: 'Approvisionnement et stock', description: 'Mouvements et situation du stock central.', fields: [
    { key: 'item', label: 'Article', required: true }, { key: 'movement_type', label: 'Type', type: 'select', options: ['Entrée', 'Sortie', 'Transfert', 'Ajustement', 'Perte'] },
    { key: 'quantity', label: 'Quantité', type: 'number', required: true }, { key: 'unit', label: 'Unité' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'destination', label: 'Destination / source' }, { key: 'reference', label: 'Référence' },
  ] },
  { slug: 'production/planning', title: 'Planification de la production', group: 'Production', description: 'Plan de production par cuisine, menu et période.', fields: [
    { key: 'plan_name', label: 'Nom du plan', required: true }, { key: 'central_kitchen', label: 'Cuisine centrale', required: true }, { key: 'sale_point', label: 'Point de vente' },
    { key: 'period_start', label: 'Début', type: 'date' }, { key: 'period_end', label: 'Fin', type: 'date' }, { key: 'menus_quantities', label: 'Menus et quantités', type: 'textarea', required: true }, { key: 'specific_ingredients', label: 'Ingrédients spécifiques', type: 'textarea' },
  ] },
  { slug: 'production/consolidated-orders', title: 'Commandes consolidées', group: 'Production', description: 'Consolidation quotidienne des commandes à produire.', fields: [
    { key: 'production_date', label: 'Date de production', type: 'date', required: true }, { key: 'central_kitchen', label: 'Cuisine centrale' }, { key: 'orders', label: 'Commandes consolidées', type: 'textarea' },
    { key: 'total_portions', label: 'Total portions', type: 'number' }, { key: 'production_notes', label: 'Instructions', type: 'textarea' },
  ] },
  { slug: 'production/central-kitchens', title: 'Cuisines centrales', group: 'Production', description: 'Cuisines, capacités, responsables et points de vente rattachés.', fields: [
    { key: 'name', label: 'Nom de la cuisine', required: true }, { key: 'manager', label: 'Responsable' }, { key: 'staff_count', label: 'Effectif', type: 'number' }, { key: 'sale_points_count', label: 'Points rattachés', type: 'number' },
    { key: 'country', label: 'Pays' }, { key: 'region', label: 'Région' }, { key: 'district', label: 'District' }, { key: 'address', label: 'Adresse' }, { key: 'daily_capacity', label: 'Capacité journalière', type: 'number' },
  ] },
  { slug: 'hr/staff', title: 'Répertoire du personnel', group: 'Ressources humaines', description: 'Dossiers du personnel et affectations.', fields: [
    { key: 'full_name', label: 'Nom complet', required: true }, { key: 'employee_number', label: 'Matricule' }, { key: 'position', label: 'Poste', required: true }, { key: 'unit', label: 'Unité' },
    { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Téléphone', type: 'tel' }, { key: 'start_date', label: 'Date de prise de service', type: 'date' }, { key: 'contract_type', label: 'Type de contrat' },
  ] },
  { slug: 'hr/leave', title: 'Congés et absences', group: 'Ressources humaines', description: 'Demandes de congé, circuits de validation et soldes.', fields: [
    { key: 'employee', label: 'Employé', required: true }, { key: 'leave_type', label: 'Type de congé', type: 'select', options: ['Annuel', 'Maladie', 'Maternité', 'Paternité', 'Permission', 'Autre'] },
    { key: 'start_date', label: 'Début', type: 'date' }, { key: 'end_date', label: 'Fin', type: 'date' }, { key: 'reason', label: 'Motif', type: 'textarea' }, { key: 'supervisor', label: 'Superviseur' },
  ] },
  { slug: 'hr/onboarding', title: 'Intégration du personnel', group: 'Ressources humaines', description: 'Parcours d’accueil, documents, formations et affectation.', fields: [
    { key: 'employee', label: 'Employé', required: true }, { key: 'start_date', label: 'Date de début', type: 'date' }, { key: 'supervisor', label: 'Superviseur' },
    { key: 'documents', label: 'Documents à remettre', type: 'textarea' }, { key: 'trainings', label: 'Formations obligatoires', type: 'textarea' }, { key: 'equipment', label: 'Équipements affectés', type: 'textarea' },
  ] },
  { slug: 'hr/performance', title: 'Performance', group: 'Ressources humaines', description: 'Objectifs, KPI, revues et plans de développement.', fields: [
    { key: 'employee', label: 'Employé', required: true }, { key: 'review_period', label: 'Période' }, { key: 'objectives', label: 'Objectifs', type: 'textarea' }, { key: 'kpi_results', label: 'Résultats KPI', type: 'textarea' },
    { key: 'score', label: 'Score', type: 'number' }, { key: 'development_plan', label: 'Plan de développement', type: 'textarea' },
  ] },
  { slug: 'hr/payroll', title: 'Paie et grille salariale', group: 'Ressources humaines', description: 'Salaires de base, composantes et bulletins.', fields: [
    { key: 'employee', label: 'Employé', required: true }, { key: 'grade', label: 'Grade' }, { key: 'step', label: 'Échelon' }, { key: 'base_salary', label: 'Salaire de base', type: 'number' },
    { key: 'allowances', label: 'Indemnités', type: 'number' }, { key: 'deductions', label: 'Retenues', type: 'number' }, { key: 'pay_period', label: 'Période de paie' },
  ] },
  { slug: 'hr/recruitment/offers', title: 'Offres d emploi', group: 'Ressources humaines', description: 'Creation et suivi des offres publiees sur le site NutVitaGlobalis.', registryColumns: ['position','department','contract_type','location','closing_date','publication_status'], fields: [
    { key: 'position', label: 'Poste', required: true }, { key: 'department', label: 'Departement / unite', type: 'select', options: ['Cabinet', 'Restauration', 'Production', 'Finance', 'Ressources humaines', 'Operations', 'Autre'] },
    { key: 'contract_type', label: 'Type de contrat', type: 'select', options: ['CDI', 'CDD', 'Consultance', 'Stage', 'Prestation', 'Autre'] }, { key: 'location', label: 'Lieu d affectation', required: true },
    { key: 'country', label: 'Pays' }, { key: 'region', label: 'Region / Etat' }, { key: 'closing_date', label: 'Date limite', type: 'date' },
    { key: 'publication_status', label: 'Publication', type: 'select', options: ['Brouillon', 'Pret a publier', 'Publie', 'Ferme'] },
    { key: 'responsibilities', label: 'Responsabilites', type: 'textarea', required: true }, { key: 'requirements', label: 'Profil recherche', type: 'textarea', required: true },
  ] },
  { slug: 'hr/recruitment/applications', title: 'Candidatures', group: 'Ressources humaines', description: 'Reception, tri, entretiens et decisions de recrutement Maximus.', registryColumns: ['candidate_name','position','stage','score','decision','interview_date'], fields: [
    { key: 'candidate_name', label: 'Candidat', required: true }, { key: 'position', label: 'Poste vise', required: true }, { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Telephone', type: 'tel' }, { key: 'stage', label: 'Etape', type: 'select', options: ['Recu', 'Preselection', 'Test', 'Entretien', 'Verification references', 'Offre', 'Rejete'] },
    { key: 'score', label: 'Score', type: 'number' }, { key: 'interview_date', label: 'Date entretien', type: 'date' }, { key: 'decision', label: 'Decision', type: 'select', options: ['En attente', 'Retenu', 'Reserve', 'Rejete'] },
    { key: 'notes', label: 'Notes RH', type: 'textarea' },
  ] },
  { slug: 'partnerships/vendors', title: 'Gestion des fournisseurs', group: 'Partenaires et fournisseurs', description: 'Fournisseurs, contrats, coordonnées et statut.', fields: [
    { key: 'structure_name', label: 'Structure', required: true }, { key: 'contact_name', label: 'Contact principal', required: true }, { key: 'nature', label: 'Nature du fournisseur' },
    { key: 'contract_number', label: 'Numéro de contrat' }, { key: 'start_date', label: 'Début', type: 'date' }, { key: 'end_date', label: 'Fin', type: 'date' }, { key: 'phone', label: 'Téléphone', type: 'tel' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'bank_account', label: 'Coordonnées bancaires', type: 'textarea' },
  ] },
  { slug: 'assets/inventory', title: 'Inventaire des actifs', group: 'Actifs', description: 'Équipements, véhicules, générateurs et affectations.', fields: [
    { key: 'asset_code', label: 'Code actif', required: true }, { key: 'name', label: 'Désignation', required: true }, { key: 'asset_type', label: 'Type', type: 'select', options: ['Équipement', 'Véhicule', 'Générateur', 'Mobilier', 'Informatique', 'Autre'] },
    { key: 'acquisition_date', label: 'Date d’acquisition', type: 'date' }, { key: 'acquisition_value', label: 'Valeur', type: 'number' }, { key: 'location', label: 'Localisation' }, { key: 'assigned_to', label: 'Affecté à' }, { key: 'condition', label: 'État' },
  ] },
  { slug: 'fleet/fueling', title: 'Carburant', group: 'Flotte', description: 'Ravitaillements, kilométrage et consommation.', fields: [
    { key: 'vehicle', label: 'Véhicule / générateur', required: true }, { key: 'date', label: 'Date', type: 'date' }, { key: 'litres', label: 'Litres', type: 'number' }, { key: 'amount', label: 'Montant', type: 'number' },
    { key: 'odometer', label: 'Kilométrage', type: 'number' }, { key: 'payment_source', label: 'Source de paiement' }, { key: 'station', label: 'Station' },
  ] },
  { slug: 'fleet/maintenance', title: 'Maintenance', group: 'Flotte', description: 'Entretiens, réparations, tâches et coûts.', fields: [
    { key: 'asset', label: 'Véhicule / équipement', required: true }, { key: 'maintenance_type', label: 'Type d’entretien' }, { key: 'planned_date', label: 'Date prévue', type: 'date' },
    { key: 'provider', label: 'Prestataire' }, { key: 'tasks', label: 'Travaux à réaliser', type: 'textarea' }, { key: 'estimated_cost', label: 'Coût estimé', type: 'number' }, { key: 'actual_cost', label: 'Coût réel', type: 'number' },
  ] },
  { slug: 'fleet/movements', title: 'Mouvements', group: 'Flotte', description: 'Demandes de déplacement, missions, chauffeurs et trajets.', fields: [
    { key: 'requester', label: 'Demandeur', required: true }, { key: 'purpose', label: 'Objet du déplacement', type: 'textarea' }, { key: 'departure', label: 'Départ' }, { key: 'destination', label: 'Destination' },
    { key: 'departure_date', label: 'Date de départ', type: 'date' }, { key: 'return_date', label: 'Date de retour', type: 'date' }, { key: 'vehicle', label: 'Véhicule' }, { key: 'driver', label: 'Chauffeur' },
  ] },
  { slug: 'finance/budget-lines', title: 'Lignes budgétaires', group: 'Finance', description: 'Structure officielle des lignes budgétaires, comptes OHADA et nature OPEX/CAPEX.', specializedForm: 'budgetLines', registryColumns: ['code', 'category', 'subCategory', 'subSubCategory', 'description', 'nature', 'ohadaClass', 'ohadaAccount', 'ohadaAccountName', 'usefulLife'], fields: [
    { key: 'selection_language', label: 'Langue de sélection', type: 'select', options: ['Français', 'English'] },
    { key: 'code', label: 'Code budgétaire', required: true, readOnly: true },
    { key: 'category', label: 'Category', type: 'select', required: true },
    { key: 'subCategory', label: 'Subcategory', type: 'select', required: true },
    { key: 'subSubCategory', label: 'Sub-subcategory', type: 'select', required: true },
    { key: 'description', label: 'Description', type: 'select', required: true },
    { key: 'comment', label: 'Commentaire', type: 'textarea' },
    { key: 'nature', label: 'Nature', hidden: true },
    { key: 'ohadaClass', label: 'OHADA Class', hidden: true },
    { key: 'ohadaAccount', label: 'OHADA Account', hidden: true },
    { key: 'ohadaAccountName', label: 'OHADA Account Name', hidden: true },
    { key: 'usefulLife', label: 'Useful Life', hidden: true },
    { key: 'amortizationMethod', label: 'Amortization Method', hidden: true },
  ] },
  { slug: 'finance/dashboard', title: 'Dashboard financier', group: 'Finance', description: 'Synthèse des budgets, engagements, paiements, caisse et trésorerie.', fields: [
    { key: 'period', label: 'Période', required: true }, { key: 'opening_balance', label: 'Solde initial', type: 'number' }, { key: 'income', label: 'Recettes', type: 'number' },
    { key: 'expenses', label: 'Dépenses', type: 'number' }, { key: 'commitments', label: 'Engagements', type: 'number' }, { key: 'closing_balance', label: 'Solde final', type: 'number' }, { key: 'comment', label: 'Commentaire', type: 'textarea' },
  ] },
  { slug: 'finance/reports', title: 'Rapports financiers', group: 'Finance', description: 'Rapports périodiques, exécution budgétaire et analyse des dépenses.', fields: [
    { key: 'title', label: 'Titre du rapport', required: true }, { key: 'period_start', label: 'Début', type: 'date' }, { key: 'period_end', label: 'Fin', type: 'date' },
    { key: 'total_budget', label: 'Budget total', type: 'number' }, { key: 'total_spent', label: 'Total dépensé', type: 'number' }, { key: 'findings', label: 'Constats', type: 'textarea' }, { key: 'recommendations', label: 'Recommandations', type: 'textarea' },
  ] },
  { slug: 'finance/requests', title: 'Demandes financières', group: 'Finance', description: 'Demandes générales et circuit de validation.', fields: [
    { key: 'title', label: 'Objet de la demande', required: true }, { key: 'requester', label: 'Demandeur', required: true }, { key: 'amount', label: 'Montant', type: 'number', required: true },
    { key: 'budget_line', label: 'Ligne budgétaire' }, { key: 'needed_by', label: 'Date souhaitée', type: 'date' }, { key: 'justification', label: 'Justification', type: 'textarea', required: true },
  ] },
  { slug: 'finance/payment-initiation', title: 'Initiation des paiements', group: 'Finance', description: 'Préparation des paiements à partir des références validées.', fields: [
    { key: 'reference_type', label: 'Type de référence', type: 'select', options: ['Demande financière', 'Estimation de coût', 'Facture', 'Autre'] }, { key: 'reference', label: 'Référence', required: true },
    { key: 'beneficiary', label: 'Bénéficiaire', required: true }, { key: 'amount', label: 'Montant', type: 'number', required: true }, { key: 'payment_method', label: 'Moyen de paiement' }, { key: 'notes', label: 'Notes', type: 'textarea' },
  ] },
  { slug: 'finance/my-payments', title: 'Mes paiements', group: 'Finance', description: 'Paiements dus ou exécutés au bénéfice du compte connecté.', fields: [
    { key: 'reference', label: 'Référence', required: true }, { key: 'beneficiary', label: 'Bénéficiaire' }, { key: 'purpose', label: 'Objet' },
    { key: 'amount', label: 'Montant', type: 'number' }, { key: 'due_date', label: 'Échéance', type: 'date' }, { key: 'payment_date', label: 'Date de paiement', type: 'date' },
  ] },
  { slug: 'finance/cash-supply-requests', title: 'Demandes d’approvisionnement de caisse', group: 'Finance', description: 'Demandes de réapprovisionnement de la petite caisse.', fields: [
    { key: 'title', label: 'Objet de la demande', required: true }, { key: 'requester', label: 'Demandeur' }, { key: 'amount', label: 'Montant', type: 'number', required: true },
    { key: 'needed_by', label: 'Date souhaitée', type: 'date' }, { key: 'justification', label: 'Justification', type: 'textarea' },
  ] },
  { slug: 'finance/cost-estimations', title: 'Estimations de coûts', group: 'Finance', description: 'Estimations validées provenant des achats et opérations.', fields: [
    { key: 'title', label: 'Objet', required: true }, { key: 'requester', label: 'Demandeur' }, { key: 'items', label: 'Détail des coûts', type: 'textarea' },
    { key: 'total_amount', label: 'Montant total', type: 'number' }, { key: 'budget_line', label: 'Ligne budgétaire' }, { key: 'validity_date', label: 'Validité', type: 'date' },
  ] },
  { slug: 'finance/payments', title: 'Exécution des paiements', group: 'Finance', description: 'Paiements exécutés, preuves et validations.', fields: [
    { key: 'payment_reference', label: 'Référence paiement', required: true }, { key: 'beneficiary', label: 'Bénéficiaire', required: true }, { key: 'amount', label: 'Montant', type: 'number', required: true },
    { key: 'payment_method', label: 'Moyen', type: 'select', options: ['Espèces', 'Virement bancaire', 'Mobile Money', 'Chèque'] }, { key: 'payment_date', label: 'Date', type: 'date' }, { key: 'proof_reference', label: 'Référence de preuve' },
  ] },
  { slug: 'finance/payment-register', title: 'Registre des paiements', group: 'Finance', description: 'Journal central de tous les paiements.', fields: [
    { key: 'reference', label: 'Référence', required: true }, { key: 'date', label: 'Date', type: 'date' }, { key: 'beneficiary', label: 'Bénéficiaire' }, { key: 'purpose', label: 'Objet' },
    { key: 'amount', label: 'Montant', type: 'number' }, { key: 'method', label: 'Moyen' }, { key: 'budget_line', label: 'Ligne budgétaire' },
  ] },
  { slug: 'finance/operational-advances', title: 'Avances opérationnelles', group: 'Finance', description: 'Avances, justification, apurement et reliquats.', fields: [
    { key: 'beneficiary', label: 'Bénéficiaire', required: true }, { key: 'purpose', label: 'Objet', required: true }, { key: 'amount', label: 'Montant avancé', type: 'number' }, { key: 'advance_date', label: 'Date', type: 'date' },
    { key: 'expensed_amount', label: 'Montant dépensé', type: 'number' }, { key: 'cleared_at', label: 'Date d’apurement', type: 'date' }, { key: 'clearing_comment', label: 'Commentaire', type: 'textarea' },
  ] },
  { slug: 'finance/petty-cash', title: 'Petite caisse', group: 'Finance', description: 'Entrées, sorties et solde de caisse.', fields: [
    { key: 'transaction_type', label: 'Type', type: 'select', options: ['Entrée', 'Sortie'] }, { key: 'date', label: 'Date', type: 'date' }, { key: 'amount', label: 'Montant', type: 'number', required: true },
    { key: 'source_or_beneficiary', label: 'Source / bénéficiaire' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'reference', label: 'Référence' },
  ] },
  { slug: 'finance/bank-transfers', title: 'Virements bancaires', group: 'Finance', description: 'Ordres de virement et suivi bancaire.', fields: [
    { key: 'beneficiary', label: 'Bénéficiaire', required: true }, { key: 'bank', label: 'Banque' }, { key: 'account_number', label: 'Compte / IBAN' }, { key: 'amount', label: 'Montant', type: 'number' },
    { key: 'transfer_date', label: 'Date', type: 'date' }, { key: 'reference', label: 'Référence bancaire' }, { key: 'purpose', label: 'Motif', type: 'textarea' },
  ] },
  { slug: 'finance/cash-deposits', title: 'Dépôts de recettes', group: 'Finance', description: 'Dépôts des recettes des points de vente.', fields: [
    { key: 'sale_point', label: 'Point de vente', required: true }, { key: 'report_reference', label: 'Rapport de vente' }, { key: 'amount', label: 'Montant déposé', type: 'number' },
    { key: 'deposit_date', label: 'Date', type: 'date' }, { key: 'deposited_by', label: 'Déposé par' }, { key: 'bank_reference', label: 'Référence banque / caisse' },
  ] },
  { slug: 'communications/messages', title: 'Messagerie Maximus', group: 'Communications', description: 'Messages internes propres a Maximus, sans melange avec l administration NutVitaGlobalis.', registryColumns: ['subject','sender','recipient','priority','message_status'], fields: [
    { key: 'subject', label: 'Sujet', required: true }, { key: 'sender', label: 'Expediteur', required: true }, { key: 'recipient', label: 'Destinataire / equipe', required: true },
    { key: 'priority', label: 'Priorite', type: 'select', options: ['Normale', 'Haute', 'Urgente'] }, { key: 'message_status', label: 'Statut', type: 'select', options: ['Brouillon', 'Envoye', 'Lu', 'Traite'] },
    { key: 'body', label: 'Message', type: 'textarea', required: true },
  ] },
  { slug: 'communications/meetings', title: 'Reunions Maximus', group: 'Communications', description: 'Planification et comptes rendus des reunions internes Maximus.', registryColumns: ['title','meeting_date','meeting_type','owner','decision_status'], fields: [
    { key: 'title', label: 'Titre', required: true }, { key: 'meeting_date', label: 'Date', type: 'date', required: true }, { key: 'meeting_type', label: 'Type', type: 'select', options: ['Direction', 'Finance', 'Production', 'Restauration', 'RH', 'Operations', 'Autre'] },
    { key: 'owner', label: 'Responsable' }, { key: 'participants', label: 'Participants', type: 'textarea' }, { key: 'agenda', label: 'Ordre du jour', type: 'textarea' },
    { key: 'decisions', label: 'Decisions', type: 'textarea' }, { key: 'decision_status', label: 'Suivi', type: 'select', options: ['A suivre', 'En cours', 'Termine'] },
  ] },
  { slug: 'administration/users', title: 'Utilisateurs Maximus', group: 'Administration Maximus', description: 'Preparation des comptes Maximus et niveaux d acces attribues par le super administrateur.', registryColumns: ['full_name','email','access_level','assigned_modules','account_status'], fields: [
    { key: 'full_name', label: 'Nom complet', required: true }, { key: 'email', label: 'Email', type: 'email', required: true }, { key: 'phone', label: 'Telephone', type: 'tel' },
    { key: 'access_level', label: 'Niveau d acces', type: 'select', options: ['Super administrateur', 'Administrateur Maximus', 'Finance', 'RH', 'Production', 'Ventes', 'Lecture seule'] },
    { key: 'assigned_modules', label: 'Modules autorises', type: 'textarea' }, { key: 'account_status', label: 'Statut', type: 'select', options: ['A creer', 'Actif', 'Suspendu', 'Desactive'] },
  ] },
  { slug: 'nutrition-analysis', title: 'Analyse nutritionnelle', group: 'Restauration', description: 'Analyse nutritionnelle des menus, portions et ingrédients.', fields: [
    { key: 'menu', label: 'Menu analysé', required: true }, { key: 'serving_size', label: 'Taille de portion' }, { key: 'energy_kcal', label: 'Énergie (kcal)', type: 'number' },
    { key: 'protein_g', label: 'Protéines (g)', type: 'number' }, { key: 'carbohydrates_g', label: 'Glucides (g)', type: 'number' }, { key: 'fat_g', label: 'Lipides (g)', type: 'number' },
    { key: 'fiber_g', label: 'Fibres (g)', type: 'number' }, { key: 'micronutrients', label: 'Micronutriments', type: 'textarea' }, { key: 'interpretation', label: 'Interprétation', type: 'textarea' },
  ] },
];

type ModuleEnhancement = Partial<Omit<MaximusModule, 'fields'>> & {
  fields?: Record<string, Partial<MaximusField>>;
};

const sourceAlignedEnhancements: Record<string, ModuleEnhancement> = {
  'menus': {
    registryColumns: ['name','menu_type','meal_type','servings','description'],
    fields: {
      menu_type: { type: 'select', options: ['classic', 'special'] },
      meal_type: { type: 'select', options: ['breakfast', 'lunch', 'dinner'] },
      ingredients: { optionSource: 'ingredients' },
    },
  },
  'sales/sale-points': {
    registryColumns: ['name','manager_name','type','central_kitchen','staff_count','status'],
    fields: {
      type: { type: 'select', options: ['Restaurant', 'Health Facility', 'Company', 'Construction Site', 'Other'] },
      central_kitchen: { optionSource: 'centralKitchens' },
    },
  },
  'sales/partner-stock': {
    registryColumns: ['movement_date','sale_point','item','category','quantity','unit','movement_type'],
    fields: {
      sale_point: { optionSource: 'salePoints' },
      item: { optionSource: 'ingredients' },
      movement_type: { type: 'select', options: ['Entrée', 'Sortie', 'Ajustement', 'Perte', 'pending', 'acknowledged'] },
    },
  },
  'sales/daily-orders': {
    registryColumns: ['order_date','sale_point','central_kitchen','menus','specific_ingredients'],
    fields: {
      sale_point: { optionSource: 'salePoints' },
      central_kitchen: { optionSource: 'centralKitchens' },
      menus: { optionSource: 'menus' },
      specific_ingredients: { optionSource: 'ingredients' },
    },
  },
  'sales/delivery-register': {
    registryColumns: ['reference','delivery_date','sale_point','status','delivered_by','received_by'],
    fields: {
      sale_point: { optionSource: 'salePoints' },
      delivered_by: { optionSource: 'staff' },
      received_by: { optionSource: 'staff' },
    },
  },
  'sales/reports': {
    registryColumns: ['report_date','sale_point','gross_sales','cash_sales','digital_sales'],
    fields: { sale_point: { optionSource: 'salePoints' } },
  },
  'supply/ingredients': {
    registryColumns: ['name','category','budget_line','unit','unit_price','minimum_stock','supplier'],
    fields: {
      category: { type: 'select', options: ['Fresh Produce', 'Proteins', 'Dry Goods', 'Dairy', 'Beverages', 'Condiments & Spices', 'Cleaning & Sanitation', 'Other'] },
      budget_line: { optionSource: 'budgetLines' },
      supplier: { optionSource: 'vendors' },
    },
  },
  'supply/consolidated-needs': {
    registryColumns: ['period_start','period_end','central_kitchen','estimated_cost'],
    fields: { central_kitchen: { optionSource: 'centralKitchens' } },
  },
  'supply/cost-estimation': {
    registryColumns: ['title','central_kitchen','period','total_amount','budget_line'],
    fields: {
      central_kitchen: { optionSource: 'centralKitchens' },
      budget_line: { optionSource: 'budgetLines' },
    },
  },
  'supply/central-stock': {
    registryColumns: ['date','item','movement_type','quantity','unit','destination','reference'],
    fields: {
      item: { optionSource: 'ingredients' },
      movement_type: { type: 'select', options: ['Entrée', 'Sortie', 'Transfert', 'Ajustement', 'Perte', 'in', 'out', 'adjustment'] },
      destination: { optionSource: 'salePoints' },
    },
  },
  'production/planning': {
    registryColumns: ['plan_name','central_kitchen','sale_point','period_start','period_end'],
    fields: {
      central_kitchen: { optionSource: 'centralKitchens' },
      sale_point: { optionSource: 'salePoints' },
      menus_quantities: { optionSource: 'menus' },
      specific_ingredients: { optionSource: 'ingredients' },
    },
  },
  'production/consolidated-orders': {
    registryColumns: ['production_date','central_kitchen','total_portions','status'],
    fields: { central_kitchen: { optionSource: 'centralKitchens' } },
  },
  'production/central-kitchens': {
    registryColumns: ['name','manager','country','region','district','daily_capacity','status'],
    fields: {
      manager: { optionSource: 'staff' },
      country: { optionSource: 'countries' },
      region: { optionSource: 'states' },
    },
  },
  'hr/staff': {
    registryColumns: ['full_name','employee_number','position','unit','contract_type','email','phone'],
    fields: {
      unit: { type: 'select', options: ['Cabinet', 'Restauration', 'Production', 'Finance', 'Ressources humaines', 'Operations', 'Logistique', 'Autre'] },
      contract_type: { type: 'select', options: ['CDI', 'CDD', 'Consultance', 'Stage', 'Prestation', 'Autre'] },
    },
  },
  'hr/leave': {
    registryColumns: ['employee','leave_type','start_date','end_date','status'],
    fields: {
      employee: { optionSource: 'staff' },
      supervisor: { optionSource: 'staff' },
      leave_type: { type: 'select', options: ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Permission', 'Other'] },
    },
  },
  'hr/onboarding': {
    registryColumns: ['employee','start_date','supervisor'],
    fields: { employee: { optionSource: 'staff' }, supervisor: { optionSource: 'staff' } },
  },
  'hr/performance': {
    registryColumns: ['employee','review_period','score','supervisor'],
    fields: { employee: { optionSource: 'staff' }, supervisor: { optionSource: 'staff' } },
  },
  'hr/payroll': {
    registryColumns: ['employee','grade','step','base_salary','pay_period'],
    fields: {
      employee: { optionSource: 'staff' },
      grade: { type: 'select', options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2'] },
    },
  },
  'hr/recruitment/offers': {
    fields: { publication_status: { type: 'select', options: ['draft', 'open'] } },
  },
  'partnerships/vendors': {
    registryColumns: ['structure_name','contact_name','nature','contract_number','start_date','end_date','status'],
    fields: {
      nature: { type: 'select', options: ['Food & Beverage Supplies', 'Non-Food Consumables', 'Equipment & Utensils', 'Utilities & Services', 'Technology & Software', 'Training', 'Project Management', 'Support for a Survey', 'Other'] },
    },
  },
  'assets/inventory': {
    registryColumns: ['asset_code','name','asset_type','location','acquisition_date','acquisition_value','condition','assigned_to'],
    fields: {
      asset_type: { type: 'select', options: ['General', 'Vehicle', 'Generator'] },
      condition: { type: 'select', options: ['Good and Functional', 'Good and Non-functional', 'Altered'] },
      location: { type: 'select', options: ['Head Office', 'Central Kitchen', 'Sale Point'] },
      assigned_to: { optionSource: 'staff' },
    },
  },
  'fleet/fueling': {
    registryColumns: ['date','vehicle','litres','amount','odometer','payment_source'],
    fields: {
      vehicle: { optionSource: 'assets' },
      payment_source: { type: 'select', options: ['Petty Cash', 'Tom Card', 'Other'] },
    },
  },
  'fleet/maintenance': {
    registryColumns: ['asset','planned_date','maintenance_type','provider','estimated_cost','actual_cost'],
    fields: {
      asset: { optionSource: 'assets' },
      maintenance_type: { type: 'select', options: ['Preventive', 'Corrective', 'Repair', 'Inspection', 'Other'] },
      provider: { optionSource: 'vendors' },
    },
  },
  'fleet/movements': {
    registryColumns: ['requester','departure_date','return_date','destination','vehicle','driver','status'],
    fields: {
      requester: { optionSource: 'staff' },
      vehicle: { optionSource: 'assets' },
      driver: { optionSource: 'staff' },
    },
  },
  'finance/dashboard': { registryColumns: ['period','opening_balance','income','expenses','commitments','closing_balance'] },
  'finance/reports': { registryColumns: ['title','period_start','period_end','total_budget','total_spent'] },
  'finance/requests': {
    registryColumns: ['title','requester','amount','budget_line','needed_by'],
    fields: { requester: { optionSource: 'staff' }, budget_line: { optionSource: 'budgetLines' } },
  },
  'finance/payment-initiation': {
    registryColumns: ['reference_type','reference','beneficiary','amount','payment_method'],
    fields: {
      reference_type: { type: 'select', options: ['Maintenance ID', 'Mission ID', 'Demande financière', 'Estimation de coût', 'Facture', 'Autre'] },
      beneficiary: { optionSource: 'vendors' },
      payment_method: { type: 'select', options: ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'] },
    },
  },
  'finance/my-payments': { registryColumns: ['reference','beneficiary','purpose','amount','due_date','payment_date'] },
  'finance/cash-supply-requests': {
    registryColumns: ['title','requester','amount','needed_by'],
    fields: { requester: { optionSource: 'staff' } },
  },
  'finance/cost-estimations': {
    registryColumns: ['title','requester','total_amount','budget_line','validity_date'],
    fields: { requester: { optionSource: 'staff' }, budget_line: { optionSource: 'budgetLines' } },
  },
  'finance/payments': {
    registryColumns: ['payment_reference','beneficiary','amount','payment_method','payment_date','proof_reference'],
    fields: {
      beneficiary: { optionSource: 'vendors' },
      payment_method: { type: 'select', options: ['Espèces', 'Virement bancaire', 'Mobile Money', 'Chèque'] },
    },
  },
  'finance/payment-register': {
    registryColumns: ['reference','date','beneficiary','purpose','amount','method','budget_line'],
    fields: {
      beneficiary: { optionSource: 'vendors' },
      method: { type: 'select', options: ['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque'] },
      budget_line: { optionSource: 'budgetLines' },
    },
  },
  'finance/operational-advances': {
    registryColumns: ['beneficiary','purpose','amount','advance_date','expensed_amount','cleared_at'],
    fields: { beneficiary: { optionSource: 'staff' } },
  },
  'finance/petty-cash': {
    registryColumns: ['date','transaction_type','source_or_beneficiary','reference','amount'],
    fields: {
      transaction_type: { type: 'select', options: ['Entrée', 'Sortie', 'bank', 'partner', 'other'] },
      source_or_beneficiary: { optionSource: 'staff' },
    },
  },
  'finance/bank-transfers': {
    registryColumns: ['beneficiary','bank','account_number','amount','transfer_date','reference'],
    fields: { beneficiary: { optionSource: 'vendors' } },
  },
  'finance/cash-deposits': {
    registryColumns: ['sale_point','report_reference','amount','deposit_date','deposited_by','bank_reference'],
    fields: { sale_point: { optionSource: 'salePoints' }, deposited_by: { optionSource: 'staff' } },
  },
  'nutrition-analysis': {
    registryColumns: ['menu','serving_size','energy_kcal','protein_g','carbohydrates_g','fat_g'],
    fields: { menu: { optionSource: 'menus' } },
  },
};

export const maximusModules: MaximusModule[] = baseMaximusModules.map(module => {
  const enhancement = sourceAlignedEnhancements[module.slug];
  if (!enhancement) return module;
  const fieldEnhancements = enhancement.fields || {};
  return {
    ...module,
    ...enhancement,
    fields: module.fields.map(field => ({ ...field, ...(fieldEnhancements[field.key] || {}) })),
  };
});

export const maximusModuleMap = new Map(maximusModules.map(module => [module.slug, module]));
export { commonStatus as maximusStatuses };
