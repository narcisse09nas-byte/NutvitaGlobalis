export type MaximusField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
};

export type MaximusModule = {
  slug: string;
  title: string;
  group: string;
  description: string;
  fields: MaximusField[];
};

const commonStatus = ['draft', 'submitted', 'validated', 'rejected', 'archived'];

export const maximusModules: MaximusModule[] = [
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
  { slug: 'finance/budget-lines', title: 'Lignes budgétaires', group: 'Finance', description: 'Structure du budget et suivi des allocations.', fields: [
    { key: 'code', label: 'Code', required: true }, { key: 'category', label: 'Catégorie', required: true }, { key: 'sub_category', label: 'Sous-catégorie' }, { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'allocated_amount', label: 'Montant alloué', type: 'number' }, { key: 'spent_amount', label: 'Montant engagé', type: 'number' }, { key: 'comment', label: 'Commentaire', type: 'textarea' },
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
  { slug: 'nutrition-analysis', title: 'Analyse nutritionnelle', group: 'Restauration', description: 'Analyse nutritionnelle des menus, portions et ingrédients.', fields: [
    { key: 'menu', label: 'Menu analysé', required: true }, { key: 'serving_size', label: 'Taille de portion' }, { key: 'energy_kcal', label: 'Énergie (kcal)', type: 'number' },
    { key: 'protein_g', label: 'Protéines (g)', type: 'number' }, { key: 'carbohydrates_g', label: 'Glucides (g)', type: 'number' }, { key: 'fat_g', label: 'Lipides (g)', type: 'number' },
    { key: 'fiber_g', label: 'Fibres (g)', type: 'number' }, { key: 'micronutrients', label: 'Micronutriments', type: 'textarea' }, { key: 'interpretation', label: 'Interprétation', type: 'textarea' },
  ] },
];

export const maximusModuleMap = new Map(maximusModules.map(module => [module.slug, module]));
export { commonStatus as maximusStatuses };
