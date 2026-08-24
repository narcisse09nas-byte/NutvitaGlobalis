import type { ResultChainNode, ResultLevel } from "./types";

export type ResultChainTreeNode = ResultChainNode & { code: string; children: ResultChainTreeNode[] };

const levelPrefix: Record<ResultLevel, string> = { impact: "I", outcome: "O", output: "P" };

// Refinement program, Wave 2: cascading codes ("I1", "I1.O1", "I1.O1.P1") derived from the tree
// shape every time it's rendered, never stored — mirrors lib/ppm/wbs.ts's buildWbsTree so
// inserting/deleting/reordering nodes never needs a renumbering pass.
export function buildResultChainTree(nodes: ResultChainNode[]): ResultChainTreeNode[] {
  const byParent = new Map<string, ResultChainNode[]>();
  for (const node of nodes) {
    const key = node.parent_id || "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(node);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.order_index - b.order_index);

  function attach(parentKey: string, prefix: string): ResultChainTreeNode[] {
    const children = byParent.get(parentKey) || [];
    return children.map((node, index) => {
      const segment = `${levelPrefix[node.level]}${index + 1}`;
      const code = prefix ? `${prefix}.${segment}` : segment;
      return { ...node, code, children: attach(node.id, code) };
    });
  }
  return attach("root", "");
}

export function flattenResultChainTree(tree: ResultChainTreeNode[]): ResultChainTreeNode[] {
  const result: ResultChainTreeNode[] = [];
  function walk(nodes: ResultChainTreeNode[]) { for (const node of nodes) { result.push(node); walk(node.children); } }
  walk(tree);
  return result;
}

// Convenience: a flat map from node id -> computed code, for components that only need to
// display/link the code (e.g. Indicator's "Resultat lie" dropdown) without building the tree UI.
export function resultChainCodesById(nodes: ResultChainNode[]): Map<string, string> {
  const flat = flattenResultChainTree(buildResultChainTree(nodes));
  return new Map(flat.map(node => [node.id, node.code]));
}
