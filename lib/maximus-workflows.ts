export type MaximusWorkflowAction = {
  id: string;
  label: string;
  sourceModule: string;
  targetModule?: string;
  successMessage: string;
};

export const maximusWorkflowActions: MaximusWorkflowAction[] = [
  {
    id: 'record_stock_movement',
    label: 'Comptabiliser le mouvement',
    sourceModule: 'supply/central-stock',
    successMessage: 'Le mouvement a été inscrit dans le grand livre de stock.',
  },
  {
    id: 'plan_production',
    label: 'Créer le plan de production',
    sourceModule: 'sales/daily-orders',
    targetModule: 'production/planning',
    successMessage: 'Le plan de production a été créé.',
  },
  {
    id: 'complete_production',
    label: 'Préparer la livraison',
    sourceModule: 'production/planning',
    targetModule: 'sales/delivery-register',
    successMessage: 'La production a été enregistrée et le bordereau de livraison créé.',
  },
  {
    id: 'confirm_delivery',
    label: 'Ouvrir le rapport de vente',
    sourceModule: 'sales/delivery-register',
    targetModule: 'sales/reports',
    successMessage: 'La livraison a été comptabilisée et le rapport de vente créé.',
  },
  {
    id: 'post_sales',
    label: 'Comptabiliser les ventes',
    sourceModule: 'sales/reports',
    targetModule: 'finance/cash-deposits',
    successMessage: 'Les ventes ont été comptabilisées et le dépôt de recettes créé.',
  },
  {
    id: 'post_deposit',
    label: 'Comptabiliser le dépôt',
    sourceModule: 'finance/cash-deposits',
    successMessage: 'Le dépôt a été comptabilisé.',
  },
];

export const maximusWorkflowActionMap = new Map(maximusWorkflowActions.map(action => [action.id, action]));

export function workflowActionFor(module: string, status: string) {
  if (status !== 'validated') return undefined;
  return maximusWorkflowActions.find(action => action.sourceModule === module);
}

export type WorkflowItem = {
  item: string;
  quantity: number;
  unit: string;
  unit_price: number;
};

export function parseWorkflowItems(value: unknown): WorkflowItem[] {
  if (Array.isArray(value)) {
    return value.map(row => {
      const item = row && typeof row === 'object' ? row as Record<string, unknown> : {};
      return {
        item: String(item.item || item.name || '').trim(),
        quantity: Number(item.quantity || 0),
        unit: String(item.unit || '').trim(),
        unit_price: Number(item.unit_price || item.price || 0),
      };
    }).filter(row => row.item && row.quantity > 0);
  }

  return String(value || '').split(/\r?\n/).map(line => {
    const [item = '', quantity = '0', unit = '', price = '0'] = line.split(/[|;]/).map(part => part.trim());
    return { item, quantity: Number(quantity), unit, unit_price: Number(price) };
  }).filter(row => row.item && Number.isFinite(row.quantity) && row.quantity > 0);
}
