"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { notifyPpmEventClient } from "@/lib/ppm/notify-client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { PPMResource, PpmTask, PpmTaskList, PpmTaskStatus } from "@/lib/ppm/types";

const COLUMNS: { value: PpmTaskStatus; label: string; labelEn: string }[] = [
  { value: "not_started", label: "A faire", labelEn: "Not started" },
  { value: "in_progress", label: "En cours", labelEn: "In progress" },
  { value: "blocked", label: "Bloque", labelEn: "Blocked" },
  { value: "done", label: "Termine", labelEn: "Done" },
];

function fmtDate(value?: string | null, en?: boolean) { return value ? new Date(value).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"; }
function daysUntil(value: string) { return Math.ceil((+new Date(`${value}T00:00:00`) - +new Date(new Date().toISOString().slice(0, 10) + "T00:00:00")) / 86400000); }

export default function TaskBoard({ taskList, initial, staff, contextLabel }: {
  taskList: PpmTaskList; initial: PpmTask[]; staff: PPMResource[]; contextLabel: string | null;
}) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<PpmTask | "new" | null>(null);

  async function moveStatus(task: PpmTask, status: PpmTaskStatus) {
    const supabase = createClient();
    const result = await supabase.from("ppm_tasks").update({ status }).eq("id", task.id).select("*").single();
    if (!result.error) setRows(current => current.map(row => row.id === task.id ? result.data as PpmTask : row));
  }

  async function removeTask(task: PpmTask) {
    if (!window.confirm(en ? "Delete this task?" : "Supprimer cette tache ?")) return;
    const supabase = createClient();
    const result = await supabase.from("ppm_tasks").delete().eq("id", task.id);
    if (!result.error) setRows(current => current.filter(row => row.id !== task.id));
  }

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{taskList.period_type === "week" ? (en ? "Weekly list" : "Liste hebdomadaire") : (en ? "Monthly list" : "Liste mensuelle")}</p>
        <h1 className="mt-1 text-3xl font-black text-forest">{taskList.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{fmtDate(taskList.period_start, en)} → {fmtDate(taskList.period_end, en)}{contextLabel ? ` · ${contextLabel}` : ""}</p>
      </div>
      <button onClick={() => setEditing("new")} className="btn-primary"><PlusIcon className="mr-2 h-5" />{en ? "Add task" : "Ajouter une tache"}</button>
    </div>

    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map(column => {
        const items = rows.filter(row => row.status === column.value);
        return <div key={column.value} className="grid gap-3">
          <h2 className="text-sm font-black uppercase text-slate-400">{en ? column.labelEn : column.label} <span className="text-slate-300">({items.length})</span></h2>
          <div className="grid gap-2">
            {items.map(task => {
              const overdue = task.deadline && task.status !== "done" && daysUntil(task.deadline) < 0;
              const soon = task.deadline && task.status !== "done" && !overdue && daysUntil(task.deadline) <= 3;
              return <div key={task.id} className="rounded-2xl border bg-white p-4">
                <b className="text-sm text-forest">{task.title}</b>
                {task.description && <p className="mt-1 text-xs text-slate-500">{task.description}</p>}
                <p className="mt-2 text-xs text-slate-500">{task.responsible_name || (en ? "Unassigned" : "Non assignee")}</p>
                {task.deadline && <p className={`mt-1 text-xs font-bold ${overdue ? "text-red-600" : soon ? "text-amber-700" : "text-slate-400"}`}>{en ? "Due" : "Echeance"} : {fmtDate(task.deadline, en)}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select value={task.status} onChange={event => moveStatus(task, event.target.value as PpmTaskStatus)} className="admin-input py-1 text-xs">
                    {COLUMNS.map(item => <option key={item.value} value={item.value}>{en ? item.labelEn : item.label}</option>)}
                  </select>
                  <button type="button" onClick={() => setEditing(task)} className="text-xs font-bold text-leaf">{en ? "Edit" : "Modifier"}</button>
                  <button type="button" onClick={() => removeTask(task)} aria-label={en ? "Delete" : "Supprimer"}><TrashIcon className="h-4 text-slate-400 hover:text-red-600" /></button>
                </div>
              </div>;
            })}
            {!items.length && <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-slate-400">{en ? "No task." : "Aucune tache."}</p>}
          </div>
        </div>;
      })}
    </div>

    {editing && <TaskFormModal taskList={taskList} task={editing === "new" ? null : editing} staff={staff} contextLabel={contextLabel} sortOrder={rows.length}
      onClose={() => setEditing(null)}
      onSaved={saved => { setRows(current => editing === "new" ? [...current, saved] : current.map(row => row.id === saved.id ? saved : row)); setEditing(null); }}
    />}
  </div>;
}

function TaskFormModal({ taskList, task, staff, contextLabel, sortOrder, onClose, onSaved }: {
  taskList: PpmTaskList; task: PpmTask | null; staff: PPMResource[]; contextLabel: string | null; sortOrder: number;
  onClose: () => void; onSaved: (task: PpmTask) => void;
}) {
  const { en } = usePpmLocale();
  const [responsibleName, setResponsibleName] = useState(task?.responsible_name || "");
  const [responsibleEmail, setResponsibleEmail] = useState(task?.responsible_email || "");
  const [responsibleUserId, setResponsibleUserId] = useState(task?.responsible_user_id || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function pickStaff(id: string) {
    const member = staff.find(item => item.id === id);
    if (!member) return;
    setResponsibleName(member.name);
    setResponsibleEmail(member.account_email || "");
    setResponsibleUserId(member.user_id || "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const deadline = String(form.get("deadline") || "") || null;
    const previousEmail = task?.responsible_email || null;
    const payload = {
      task_list_id: taskList.id,
      title,
      description: String(form.get("description") || "").trim() || null,
      responsible_name: responsibleName.trim() || null,
      responsible_email: responsibleEmail.trim().toLowerCase() || null,
      responsible_user_id: responsibleUserId || null,
      deadline,
      status: (task ? String(form.get("status") || task.status) : "not_started") as PpmTask["status"],
      sort_order: task ? task.sort_order : sortOrder,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = task
      ? await supabase.from("ppm_tasks").update(payload).eq("id", task.id).select("*").single()
      : await supabase.from("ppm_tasks").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as PpmTask;

    if (saved.responsible_email && saved.responsible_email !== previousEmail) {
      await notifyPpmEventClient({
        recipient: { userId: saved.responsible_user_id || undefined, email: saved.responsible_email },
        category: "info",
        titleFr: "Tache assignee", titleEn: "Task assigned",
        messageFr: `${saved.title}${deadline ? ` — echeance : ${fmtDate(deadline)}` : ""}`,
        messageEn: `${saved.title}${deadline ? ` — deadline: ${fmtDate(deadline, true)}` : ""}`,
        link: `/op-management/taches/${taskList.id}`,
        emailTemplateId: "ppm_task_assigned",
        emailVariables: {
          name: saved.responsible_name || "",
          task_title: saved.title,
          context_line: contextLabel ? `${en ? "Context" : "Contexte"} : ${contextLabel}` : "",
          deadline: deadline ? fmtDate(deadline) : (en ? "Not set" : "Non definie"),
        },
      });
    }
    onSaved(saved);
  }

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{task ? (en ? "Edit task" : "Modifier la tache") : (en ? "New task" : "Nouvelle tache")}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">{en ? "Title" : "Titre"}<input name="title" defaultValue={task?.title || ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Description" : "Description"}<textarea name="description" defaultValue={task?.description || ""} rows={2} className="admin-input" /></label>
        {!!staff.length && <label className="grid gap-2 text-sm font-bold">{en ? "Quick pick (staff)" : "Selection rapide (staff)"}<select onChange={event => pickStaff(event.target.value)} defaultValue="" className="admin-input"><option value="">{en ? "— or type below —" : "— ou saisir ci-dessous —"}</option>{staff.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="grid gap-2 text-sm font-bold">{en ? "Responsible — name" : "Responsable — nom"}<input value={responsibleName} onChange={event => setResponsibleName(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Responsible — email" : "Responsable — email"}<input type="email" value={responsibleEmail} onChange={event => setResponsibleEmail(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Deadline" : "Echeance"}<input type="date" name="deadline" defaultValue={task?.deadline || ""} className="admin-input" /></label>
        {task && <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={task.status} className="admin-input">{COLUMNS.map(item => <option key={item.value} value={item.value}>{en ? item.labelEn : item.label}</option>)}</select></label>}
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
      </div>
    </form>
  </div>;
}
