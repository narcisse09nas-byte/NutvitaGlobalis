import type { BudgetCategory } from "./types";

export type BudgetCategoryTreeNode = BudgetCategory & { code: string; children: BudgetCategoryTreeNode[] };

// Refinement program, Wave 4: budget categories mirror lib/ppm/wbs.ts exactly — a self-referencing
// tree with hierarchical codes ("1.2.1") computed from tree shape at render time, never stored.
export function buildBudgetCategoryTree(categories: BudgetCategory[]): BudgetCategoryTreeNode[] {
  const byParent = new Map<string, BudgetCategory[]>();
  for (const category of categories) {
    const key = category.parent_id || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(category);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order_index - b.order_index);

  function attach(parentKey: string, prefix: string): BudgetCategoryTreeNode[] {
    const children = byParent.get(parentKey) || [];
    return children.map((category, index) => {
      const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      return { ...category, code, children: attach(category.id, code) };
    });
  }
  return attach("root", "");
}

export function flattenBudgetCategoryTree(tree: BudgetCategoryTreeNode[]): BudgetCategoryTreeNode[] {
  const result: BudgetCategoryTreeNode[] = [];
  function walk(nodes: BudgetCategoryTreeNode[]) { for (const node of nodes) { result.push(node); walk(node.children); } }
  walk(tree);
  return result;
}

export function budgetCategoryLeafNodes(categories: BudgetCategory[]): BudgetCategory[] {
  const parentIds = new Set(categories.map(category => category.parent_id).filter((id): id is string => !!id));
  return categories.filter(category => !parentIds.has(category.id));
}
