import type { WBSNode } from "./types";

export type WBSTreeNode = WBSNode & { code: string; children: WBSTreeNode[] };

// Hierarchical codes ("1.1.1.2") are derived from the tree shape every time it's rendered,
// never stored — inserting, deleting or reordering nodes never requires a renumbering pass.
export function buildWbsTree(nodes: WBSNode[]): WBSTreeNode[] {
  const byParent = new Map<string, WBSNode[]>();
  for (const node of nodes) {
    const key = node.parent_id || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order_index - b.order_index);

  function attach(parentKey: string, prefix: string): WBSTreeNode[] {
    const children = byParent.get(parentKey) || [];
    return children.map((node, index) => {
      const code = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
      return { ...node, code, children: attach(node.id, code) };
    });
  }
  return attach("root", "");
}

export function flattenWbsTree(tree: WBSTreeNode[]): WBSTreeNode[] {
  const result: WBSTreeNode[] = [];
  function walk(nodes: WBSTreeNode[]) { for (const node of nodes) { result.push(node); walk(node.children); } }
  walk(tree);
  return result;
}

// Refinement program, Wave 1: "Work Package" is any WBS node with no children — not
// hardcoded to level 4. A real WBS branch doesn't always go exactly 4 levels deep, so
// filtering on `level === 4` silently produced an empty Work Package dropdown for any
// project whose hierarchy wasn't uniformly that deep. Use this everywhere "Work Package"
// used to mean `node.level === 4`.
export function wbsLeafNodes(nodes: WBSNode[]): WBSNode[] {
  const parentIds = new Set(nodes.map(node => node.parent_id).filter((id): id is string => !!id));
  return nodes.filter(node => !parentIds.has(node.id));
}

export function wbsLeafTreeNodes(tree: WBSTreeNode[]): WBSTreeNode[] {
  return flattenWbsTree(tree).filter(node => !node.children.length);
}
