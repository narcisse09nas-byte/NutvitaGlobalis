"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Operation, PpmTaskList, PpmTaskPeriodType, Project } from "@/lib/ppm/types";

type LinkType = "none" | "project" | "operation";

function suggestedEnd(start: string, type: PpmTaskPeriodType) {
  if (!start) return "";
  const date = new Date(`${start}T00:00:00`);
  if (type === "week") date.setDate(date.getDate() + 6);
  else { date.setMonth(date.getMonth() + 1); date.setDate(date.getDate() - 1); }
  return date.toISOString().slice(0, 10);
}

export default function TaskListManager({ initial, projects, operations }: {
  initial: PpmTaskList[]; projects: Project[]; operations: Operation[];
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("none");
  const [projectId, setProjectId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [periodType, setPeriodType] = useState<PpmTaskPeriodType>("week");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [endEdited, setEndEdited] = useState(false);

  const contextLabel = (row: PpmTaskList) => {
    if (row.project_id) return projects.find(item => item.id === row.project_id)?.name;
    if (row.operation_id) return operations.find(item => item.id === row.operation_id)?.name;
    return null;
  };

  function updateStart(value: string) {
    setPeriodStart(value);
    if (!endEdited) setPeriodEnd(suggestedEnd(value, periodType));
  }
  function updateType(value: PpmTaskPeriodType) {
    setPeriodType(value);
    if (!endEdited) setPeriodEnd(suggestedEnd(periodStart, value));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    if (!periodStart || !periodEnd) { setSaving(false); setMessage(en ? "Start and end dates are required." : "Les dates de debut et de fin sont obligatoires."); return; }

    const organizationId = linkType === "project" ? projects.find(item => item.id === projectId)?.organization_id
      : linkType === "operation" ? operations.find(item => item.id === operationId)?.organization_id : null;
    const payload = {
      title, period_type: periodType, period_start: periodStart, period_end: periodEnd,
      project_id: linkType === "project" ? projectId || null : null,
      operation_id: linkType === "operation" ? operationId || null : null,
      organization_id: organizationId || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_task_lists").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [result.data as PpmTaskList, ...current]);
    setCreating(false);
    setLinkType("none"); setProjectId(""); setOperationId(""); setPeriodStart(""); setPeriodEnd(""); setEndEdited(false);
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-3xl font-black text-forest">{en ? "Task board" : "Tableau de taches"}</h1><p className="mt-1 text-sm text-slate-500">{en ? "Weekly or monthly checklists, with an owner and a deadline per task." : "Checklists hebdomadaires ou mensuelles, avec un responsable et une echeance par tache."}</p></div>
      <button onClick={() => setCreating(true)} className="btn-primary"><PlusIcon className="mr-2 h-5" />{en ? "New list" : "Nouvelle liste"}</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(row => <Link key={row.id} href={`/op-management/taches/${row.id}`} className="rounded-2xl border bg-white p-5 hover:border-leaf">
        <div className="flex items-center justify-between gap-2"><b className="text-forest">{row.title}</b><span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-forest">{row.period_type === "week" ? (en ? "Week" : "Semaine") : (en ? "Month" : "Mois")}</span></div>
        <p className="mt-2 text-xs text-slate-500">{new Date(row.period_start).toLocaleDateString(en ? "en-US" : "fr-FR")} → {new Date(row.period_end).toLocaleDateString(en ? "en-US" : "fr-FR")}</p>
        {contextLabel(row) && <p className="mt-1 text-xs text-slate-400">{contextLabel(row)}</p>}
      </Link>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-10 text-center text-slate-400 sm:col-span-2 lg:col-span-3">{en ? "No task list yet." : "Aucune liste de taches pour le moment."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "New task list" : "Nouvelle liste de taches"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Period" : "Periode"}<select value={periodType} onChange={event => updateType(event.target.value as PpmTaskPeriodType)} className="admin-input"><option value="week">{en ? "Weekly" : "Hebdomadaire"}</option><option value="month">{en ? "Monthly" : "Mensuelle"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Linked to" : "Rattache a"}<select value={linkType} onChange={event => setLinkType(event.target.value as LinkType)} className="admin-input"><option value="none">{en ? "None" : "Aucun"}</option><option value="project">{en ? "Project" : "Projet"}</option><option value="operation">{en ? "Operation" : "Operation"}</option></select></label>
          {linkType === "project" && <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Project" : "Projet"}<select value={projectId} onChange={event => setProjectId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          {linkType === "operation" && <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Operation" : "Operation"}<select value={operationId} onChange={event => setOperationId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{operations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Start date" : "Date de debut"}<input type="date" value={periodStart} onChange={event => updateStart(event.target.value)} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "End date" : "Date de fin"}<input type="date" value={periodEnd} onChange={event => { setPeriodEnd(event.target.value); setEndEdited(true); }} required className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
