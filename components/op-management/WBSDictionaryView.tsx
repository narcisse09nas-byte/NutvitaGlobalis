"use client";
// Refinement program, Wave 2: every WBS node already carries the full set of PMBOK "dictionary"
// fields (scope in/out, responsible, expected result, deliverables, acceptance criteria, duration,
// cost) — there was no missing data, only a missing consolidated view. This is a read-only,
// printable listing over the same lib/ppm/wbs.ts tree helpers, not a new table.
import { useMemo, useState } from "react";
import { PrinterIcon } from "@heroicons/react/24/outline";
import { buildWbsTree, flattenWbsTree } from "@/lib/ppm/wbs";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { WBSNode } from "@/lib/ppm/types";

const levelNamesFr = ["", "Projet", "Composante", "Sous-composante", "Work Package"];
const levelNamesEn = ["", "Project", "Component", "Sub-component", "Work Package"];

export default function WBSDictionaryView({ nodes }: { nodes: WBSNode[] }) {
  const { en } = usePpmLocale();
  const levelNames = en ? levelNamesEn : levelNamesFr;
  const [open, setOpen] = useState(false);
  const flat = useMemo(() => flattenWbsTree(buildWbsTree(nodes)), [nodes]);

  return <div className="grid gap-3">
    <button onClick={() => setOpen(current => !current)} className="btn-secondary w-fit px-4 py-2 text-sm">
      {open ? (en ? "Hide WBS dictionary" : "Masquer le dictionnaire WBS") : (en ? "Show WBS dictionary" : "Afficher le dictionnaire WBS")}
    </button>
    {open && <div className="grid gap-3 rounded-2xl border bg-white p-6 print:border-0">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-forest">{en ? "WBS Dictionary" : "Dictionnaire WBS"}</h2>
        <button onClick={() => window.print()} className="btn-secondary px-3 py-2 text-xs"><PrinterIcon className="mr-2 h-4" />{en ? "Print" : "Imprimer"}</button>
      </div>
      {!flat.length && <p className="text-center text-slate-400">{en ? "No WBS to document." : "Aucun WBS a documenter."}</p>}
      {flat.map(node => <article key={node.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{node.code}</span>
          <b className="text-forest">{node.title}</b>
          <span className="text-xs text-slate-400">{levelNames[node.level]}</span>
        </div>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {node.description && <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase text-slate-400">Description</dt><dd className="mt-1 text-sm text-slate-600">{node.description}</dd></div>}
          {node.scope_included && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Scope included" : "Perimetre inclus"}</dt><dd className="mt-1 text-sm text-slate-600">{node.scope_included}</dd></div>}
          {node.scope_excluded && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Scope excluded" : "Perimetre exclu"}</dt><dd className="mt-1 text-sm text-slate-600">{node.scope_excluded}</dd></div>}
          {node.responsible_name && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Responsible" : "Responsable"}</dt><dd className="mt-1 text-sm text-slate-600">{node.responsible_name}</dd></div>}
          {node.expected_result && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Expected result" : "Resultat attendu"}</dt><dd className="mt-1 text-sm text-slate-600">{node.expected_result}</dd></div>}
          {node.deliverables && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Deliverables" : "Livrables"}</dt><dd className="mt-1 text-sm text-slate-600">{node.deliverables}</dd></div>}
          {node.acceptance_criteria && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Acceptance criteria" : "Criteres d'acceptation"}</dt><dd className="mt-1 text-sm text-slate-600">{node.acceptance_criteria}</dd></div>}
          {node.estimated_duration_days != null && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Estimated duration" : "Duree estimee"}</dt><dd className="mt-1 text-sm text-slate-600">{node.estimated_duration_days} {en ? "days" : "jours"}</dd></div>}
          {node.estimated_cost != null && <div><dt className="text-xs font-bold uppercase text-slate-400">{en ? "Estimated cost" : "Cout estimatif"}</dt><dd className="mt-1 text-sm text-slate-600">{node.estimated_cost.toLocaleString("fr-FR")}</dd></div>}
        </dl>
      </article>)}
    </div>}
  </div>;
}
