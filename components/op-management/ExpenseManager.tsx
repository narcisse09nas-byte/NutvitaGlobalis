"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type {
  Activity, BudgetLine, Expense, ExpenseCategory, ExpenseEvidence, ExpenseEvidenceCategory,
  ExpenseStatus, PaymentMethod, ProcurementItem, WBSNode,
} from "@/lib/ppm/types";

const categoryLabels: Record<ExpenseCategory, string> = {
  personnel: "Personnel", consultants: "Consultants", travel: "Voyage", transport: "Transport",
  accommodation: "Hebergement", training: "Formation", workshop: "Atelier", supplies: "Fournitures",
  equipment: "Equipement", communication: "Communication", services: "Services", other: "Autres",
};
const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Especes", bank_transfer: "Virement", check: "Cheque", mobile_money: "Mobile money", card: "Carte", other: "Autre",
};
const statusLabels: Record<ExpenseStatus, string> = {
  draft: "Brouillon", submitted: "Soumise", finance_review: "Revue finance", manager_approval: "Approbation manager",
  posted: "Postee", returned: "Retournee", rejected: "Rejetee", cancelled: "Annulee",
};
const statusTones: Record<ExpenseStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", finance_review: "bg-amber-50 text-amber-800",
  manager_approval: "bg-amber-50 text-amber-800", posted: "bg-mint text-forest", returned: "bg-orange/10 text-orange",
  rejected: "bg-red-50 text-red-700", cancelled: "bg-slate-200 text-slate-500",
};
const evidenceCategoryLabels: Record<ExpenseEvidenceCategory, string> = {
  invoice: "Facture", purchase_order: "Bon de commande", contract: "Contrat", delivery_note: "Bon de livraison",
  receipt_note: "PV de reception", mission_order: "Ordre de mission", ticket: "Billet", mission_report: "Rapport de mission",
  liquidation: "Liquidation", other: "Autre",
};

export default function ExpenseManager({ projectId, initial, budgetLines, wbsNodes, activities, procurementItems }: {
  projectId: string; initial: Expense[]; budgetLines: BudgetLine[]; wbsNodes: WBSNode[]; activities: Activity[]; procurementItems: ProcurementItem[];
}) {
  const [rows, setRows] = useState(initial);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [scope, setScope] = useState<"mine" | "all" | "to_verify" | "to_approve">("all");
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deciding, setDeciding] = useState<{ row: Expense; nextStatus: ExpenseStatus } | null>(null);
  const [evidence, setEvidence] = useState<ExpenseEvidence[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null)); }, []);

  const filtered = rows.filter(row => {
    if (scope === "mine") return row.created_by === currentUserId;
    if (scope === "to_verify") return row.status === "submitted" || row.status === "finance_review";
    if (scope === "to_approve") return row.status === "manager_approval";
    return true;
  });

  const budgetLineLabel = (id?: string | null) => budgetLines.find(item => item.id === id)?.description || "—";

  function openEditor(row: Expense | "new") {
    setMessage("");
    setEvidence([]);
    setEditing(row);
    if (row !== "new") loadEvidence(row.id);
  }

  async function loadEvidence(expenseId: string) {
    const { data } = await createClient().from("ppm_expense_evidence").select("*").eq("expense_id", expenseId).order("created_at", { ascending: false });
    setEvidence((data || []) as ExpenseEvidence[]);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">Depenses</h2><p className="text-sm text-slate-500">{filtered.length} depense(s)</p></div>
      <button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle depense</button>
    </div>

    <div className="flex flex-wrap gap-2">
      {([["all", "Toutes"], ["mine", "Mes depenses"], ["to_verify", "A verifier"], ["to_approve", "A approuver"]] as const).map(([value, label]) => <button key={value} onClick={() => setScope(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${scope === value ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{label}</button>)}
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Depense</th><th className="p-4">Ligne budgetaire</th><th className="p-4">Montant TTC</th><th className="p-4">Date</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {filtered.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.description}</b>{row.category && <p className="mt-1 text-xs text-slate-400">{categoryLabels[row.category]}{row.payee_name ? ` · ${row.payee_name}` : ""}</p>}</td>
            <td className="p-4">{budgetLineLabel(row.budget_line_id)}</td>
            <td className="p-4">{row.amount_incl_tax.toLocaleString("fr-FR")} {row.transaction_currency}</td>
            <td className="p-4">{row.expense_date ? new Date(row.expense_date).toLocaleDateString("fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span></td>
            <td className="p-4"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">Ouvrir</button></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucune depense.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <ExpenseFormModal
      projectId={projectId} editing={editing} budgetLines={budgetLines} wbsNodes={wbsNodes} activities={activities}
      procurementItems={procurementItems} allExpenses={rows} evidence={evidence} setEvidence={setEvidence}
      onClose={() => setEditing(null)}
      onSaved={row => { setRows(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [row, ...current]); setEditing(row); }}
      onDecide={(row, nextStatus) => setDeciding({ row, nextStatus })}
    />}

    {deciding && <div className="fixed inset-0 z-[160] overflow-y-auto bg-slate-950/60 p-4">
      <DecisionForm
        deciding={deciding}
        onCancel={() => setDeciding(null)}
        onConfirm={async (fields) => {
          setSaving(true);
          setMessage("");
          const supabase = createClient();
          const now = new Date().toISOString();
          const payload: Record<string, unknown> = { status: deciding.nextStatus };
          if (deciding.nextStatus === "finance_review") { payload.finance_reviewed_by_name = fields.name; payload.finance_review_note = fields.note; payload.finance_reviewed_at = now; }
          if (deciding.nextStatus === "manager_approval") { payload.finance_reviewed_by_name = fields.name; payload.finance_review_note = fields.note; payload.finance_reviewed_at = now; }
          if (deciding.nextStatus === "posted") { payload.approved_by_name = fields.name; payload.approval_note = fields.note; payload.approved_at = now; payload.posted_at = now; }
          if (deciding.nextStatus === "returned" || deciding.nextStatus === "rejected") { payload.approval_note = fields.note; }
          const result = await supabase.from("ppm_expenses").update(payload).eq("id", deciding.row.id).select("*").single();
          setSaving(false);
          if (result.error) { setMessage(result.error.message); return; }
          const updated = result.data as Expense;
          if (deciding.nextStatus === "posted") {
            if (updated.budget_line_id) {
              const line = budgetLines.find(item => item.id === updated.budget_line_id);
              await supabase.from("ppm_budget_lines").update({ spent_amount: Number(line?.spent_amount || 0) + Number(updated.converted_amount ?? updated.amount_incl_tax) }).eq("id", updated.budget_line_id);
            }
            if (updated.activity_id) {
              const activity = activities.find(item => item.id === updated.activity_id);
              await supabase.from("ppm_activities").update({ actual_expense: Number(activity?.actual_expense || 0) + Number(updated.converted_amount ?? updated.amount_incl_tax) }).eq("id", updated.activity_id);
            }
            if (updated.procurement_item_id) {
              const linkedExpenses = rows.filter(item => item.procurement_item_id === updated.procurement_item_id && item.status === "posted");
              const totalPaid = linkedExpenses.reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax), 0) + Number(updated.converted_amount ?? updated.amount_incl_tax);
              const procurementItem = procurementItems.find(item => item.id === updated.procurement_item_id);
              const paymentStatus = procurementItem?.awarded_amount && totalPaid >= procurementItem.awarded_amount ? "paid" : "partially_paid";
              await supabase.from("ppm_procurement_items").update({ payment_status: paymentStatus }).eq("id", updated.procurement_item_id);
            }
          }
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Depense ${statusLabels[updated.status].toLowerCase()} — ${updated.description}`, from_status: deciding.row.status, to_status: updated.status, note: fields.note || undefined });
          setRows(current => current.map(item => item.id === updated.id ? updated : item));
          setDeciding(null);
          setEditing(null);
        }}
        saving={saving}
        message={message}
      />
    </div>}
  </div>;
}

function DecisionForm({ deciding, onCancel, onConfirm, saving, message }: {
  deciding: { row: Expense; nextStatus: ExpenseStatus }; onCancel: () => void;
  onConfirm: (fields: { name: string; note: string }) => void; saving: boolean; message: string;
}) {
  return <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); onConfirm({ name: String(form.get("name") || ""), note: String(form.get("note") || "") }); }} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
    <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{statusLabels[deciding.nextStatus]} — {deciding.row.description}</h2><button type="button" onClick={onCancel} className="text-2xl">×</button></div>
    <div className="mt-5 grid gap-4">
      <label className="grid gap-2 text-sm font-bold">Nom<input name="name" className="admin-input" /></label>
      <label className="grid gap-2 text-sm font-bold">Commentaire<textarea name="note" rows={3} className="admin-input" /></label>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Confirmer"}</button></div>
    </div>
  </form>;
}

function ExpenseFormModal({ projectId, editing, budgetLines, wbsNodes, activities, procurementItems, allExpenses, evidence, setEvidence, onClose, onSaved, onDecide }: {
  projectId: string; editing: Expense | "new"; budgetLines: BudgetLine[]; wbsNodes: WBSNode[]; activities: Activity[]; procurementItems: ProcurementItem[];
  allExpenses: Expense[]; evidence: ExpenseEvidence[]; setEvidence: (rows: ExpenseEvidence[]) => void;
  onClose: () => void; onSaved: (row: Expense) => void; onDecide: (row: Expense, nextStatus: ExpenseStatus) => void;
}) {
  const isNew = editing === "new";
  const formRef = useRef<HTMLFormElement>(null);
  const [budgetLineId, setBudgetLineId] = useState(isNew ? "" : editing.budget_line_id || "");
  const [amountInclTax, setAmountInclTax] = useState(isNew ? "" : String(editing.amount_incl_tax ?? ""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const budgetLine = budgetLines.find(item => item.id === budgetLineId);
  const budgetCheck = useMemo(() => {
    if (!budgetLine) return null;
    const approved = Number(budgetLine.revised_budget ?? budgetLine.initial_budget ?? 0);
    const committed = Number(budgetLine.committed_amount || 0);
    const alreadySpent = allExpenses
      .filter(item => item.budget_line_id === budgetLineId && item.status === "posted" && item.id !== (isNew ? "" : editing.id))
      .reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax), 0);
    const current = Number(amountInclTax || 0);
    const availableBefore = approved - committed - alreadySpent;
    const availableAfter = availableBefore - current;
    return { approved, committed, alreadySpent, current, availableBefore, availableAfter };
  }, [budgetLine, budgetLineId, amountInclTax, allExpenses, isNew, editing]);

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || isNew) return;
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/expenses/${editing.id}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) { setMessage(upload.error.message); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_expense_evidence").insert({ expense_id: editing.id, title: file.name, category: "other", file_path: path, created_by: user?.id }).select("*").single();
    if (!result.error) setEvidence([result.data as ExpenseEvidence, ...evidence]);
  }

  async function viewEvidence(path?: string) {
    if (!path) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(path, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function submit(nextStatus: ExpenseStatus) {
    if (!formRef.current) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(formRef.current);
    if (budgetCheck && budgetCheck.availableAfter < 0 && !String(form.get("over_budget_justification") || "").trim() && nextStatus !== "draft") {
      setSaving(false); setMessage("Cette depense depasse le disponible budgetaire : une justification est obligatoire."); return;
    }
    const amountExclTax = Number(form.get("amount_excl_tax") || 0);
    const taxAmount = Number(form.get("tax_amount") || 0);
    const exchangeRate = Number(form.get("exchange_rate") || 1);
    const payload = {
      project_id: projectId,
      work_package_id: String(form.get("work_package_id") || "") || null,
      activity_id: String(form.get("activity_id") || "") || null,
      budget_line_id: budgetLineId || null,
      procurement_item_id: String(form.get("procurement_item_id") || "") || null,
      donor_name: String(form.get("donor_name") || "").trim() || null,
      grant_reference: String(form.get("grant_reference") || "").trim() || null,
      cost_center: String(form.get("cost_center") || "").trim() || null,
      expense_date: String(form.get("expense_date") || "") || null,
      category: String(form.get("category") || "") as ExpenseCategory || null,
      sub_category: String(form.get("sub_category") || "").trim() || null,
      description: String(form.get("description") || "").trim(),
      justification: String(form.get("justification") || "").trim() || null,
      payee_name: String(form.get("payee_name") || "").trim() || null,
      location: String(form.get("location") || "").trim() || null,
      amount_excl_tax: amountExclTax,
      tax_amount: taxAmount,
      amount_incl_tax: Number(amountInclTax || 0),
      transaction_currency: String(form.get("transaction_currency") || "XAF"),
      project_currency: String(form.get("project_currency") || "XAF"),
      exchange_rate: exchangeRate,
      converted_amount: Number(amountInclTax || 0) * exchangeRate,
      payment_method: String(form.get("payment_method") || "") as PaymentMethod || null,
      payment_date: String(form.get("payment_date") || "") || null,
      transaction_reference: String(form.get("transaction_reference") || "").trim() || null,
      invoice_number: String(form.get("invoice_number") || "").trim() || null,
      invoice_date: String(form.get("invoice_date") || "") || null,
      po_reference: String(form.get("po_reference") || "").trim() || null,
      contract_reference: String(form.get("contract_reference") || "").trim() || null,
      supplier_name: String(form.get("supplier_name") || "").trim() || null,
      over_budget_justification: String(form.get("over_budget_justification") || "").trim() || null,
      status: nextStatus,
      submitted_at: nextStatus === "submitted" ? new Date().toISOString() : (isNew ? null : editing.submitted_at) || null,
    };
    if (!payload.description) { setSaving(false); setMessage("La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = isNew
      ? await supabase.from("ppm_expenses").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_expenses").update(payload).eq("id", editing.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    onSaved(result.data as Expense);
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
    <form ref={formRef} onSubmit={event => event.preventDefault()} className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{isNew ? "Nouvelle depense" : "Depense"}</h2><button type="button" onClick={onClose} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">Referencement</h3>
        <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={isNew ? "" : editing.work_package_id || ""} className="admin-input"><option value="">Aucun</option>{wbsNodes.filter(node => node.level === 4).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Activite<select name="activity_id" defaultValue={isNew ? "" : editing.activity_id || ""} className="admin-input"><option value="">Aucune</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Ligne budgetaire<select value={budgetLineId} onChange={event => setBudgetLineId(event.target.value)} className="admin-input"><option value="">Aucune</option>{budgetLines.map(item => <option key={item.id} value={item.id}>{item.description}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Achat lie (procurement)<select name="procurement_item_id" defaultValue={isNew ? "" : editing.procurement_item_id || ""} className="admin-input"><option value="">Aucun</option>{procurementItems.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Bailleur<input name="donor_name" defaultValue={isNew ? "" : editing.donor_name || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Grant<input name="grant_reference" defaultValue={isNew ? "" : editing.grant_reference || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Centre de cout<input name="cost_center" defaultValue={isNew ? "" : editing.cost_center || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Date de depense<input name="expense_date" type="date" defaultValue={isNew ? "" : editing.expense_date || ""} className="admin-input" /></label>

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">Nature de la depense</h3>
        <label className="grid gap-2 text-sm font-bold">Categorie<select name="category" defaultValue={isNew ? "" : editing.category || ""} className="admin-input"><option value="">—</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Sous-categorie<input name="sub_category" defaultValue={isNew ? "" : editing.sub_category || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<input name="description" defaultValue={isNew ? "" : editing.description} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Justification<textarea name="justification" rows={2} defaultValue={isNew ? "" : editing.justification || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Fournisseur / beneficiaire<input name="payee_name" defaultValue={isNew ? "" : editing.payee_name || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Lieu<input name="location" defaultValue={isNew ? "" : editing.location || ""} className="admin-input" /></label>

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">Informations financieres</h3>
        <label className="grid gap-2 text-sm font-bold">Montant HT<input name="amount_excl_tax" type="number" step="0.01" defaultValue={isNew ? "" : editing.amount_excl_tax ?? ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Taxes<input name="tax_amount" type="number" step="0.01" defaultValue={isNew ? "" : editing.tax_amount ?? ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Montant TTC<input type="number" step="0.01" value={amountInclTax} onChange={event => setAmountInclTax(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Devise transaction<input name="transaction_currency" defaultValue={isNew ? "XAF" : editing.transaction_currency || "XAF"} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Devise projet<input name="project_currency" defaultValue={isNew ? "XAF" : editing.project_currency || "XAF"} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Taux de change<input name="exchange_rate" type="number" step="0.0001" defaultValue={isNew ? 1 : editing.exchange_rate ?? 1} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Mode de paiement<select name="payment_method" defaultValue={isNew ? "" : editing.payment_method || ""} className="admin-input"><option value="">—</option>{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Date de paiement<input name="payment_date" type="date" defaultValue={isNew ? "" : editing.payment_date || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Reference transaction<input name="transaction_reference" defaultValue={isNew ? "" : editing.transaction_reference || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Numero facture<input name="invoice_number" defaultValue={isNew ? "" : editing.invoice_number || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Date facture<input name="invoice_date" type="date" defaultValue={isNew ? "" : editing.invoice_date || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">PO<input name="po_reference" defaultValue={isNew ? "" : editing.po_reference || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Contrat<input name="contract_reference" defaultValue={isNew ? "" : editing.contract_reference || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Fournisseur<input name="supplier_name" defaultValue={isNew ? "" : editing.supplier_name || ""} className="admin-input" /></label>

        {budgetCheck && <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <h3 className="text-sm font-black uppercase text-slate-400">Controle budgetaire</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <p>Budget approuve : <b>{budgetCheck.approved.toLocaleString("fr-FR")}</b></p>
            <p>Engagements : <b>{budgetCheck.committed.toLocaleString("fr-FR")}</b></p>
            <p>Depenses validees : <b>{budgetCheck.alreadySpent.toLocaleString("fr-FR")}</b></p>
            <p>Depense actuelle : <b>{budgetCheck.current.toLocaleString("fr-FR")}</b></p>
            <p>Disponible avant : <b>{budgetCheck.availableBefore.toLocaleString("fr-FR")}</b></p>
            <p className={budgetCheck.availableAfter < 0 ? "text-red-600" : ""}>Disponible apres : <b>{budgetCheck.availableAfter.toLocaleString("fr-FR")}</b></p>
          </div>
          {budgetCheck.availableAfter < 0 && <div className="mt-3 rounded-xl bg-red-50 p-3">
            <p className="font-bold text-red-700">⚠ Cette depense depasse le disponible budgetaire.</p>
            <textarea name="over_budget_justification" rows={2} placeholder="Justification obligatoire" defaultValue={isNew ? "" : editing.over_budget_justification || ""} className="admin-input mt-2" />
          </div>}
        </div>}

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">Pieces justificatives</h3>
        {!isNew ? <div className="sm:col-span-2 grid gap-2">
          <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">Ajouter une piece<input type="file" onChange={uploadEvidence} className="hidden" /></label>
          {evidence.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm"><span>{evidenceCategoryLabels[item.category]} — {item.title}</span>{item.file_path && <button type="button" onClick={() => viewEvidence(item.file_path)} className="text-xs font-bold text-leaf">Voir</button>}</div>)}
        </div> : <p className="text-sm text-slate-400 sm:col-span-2">Enregistrez d&apos;abord un brouillon pour pouvoir ajouter des pieces.</p>}

        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary">Fermer</button>
          {(isNew || editing.status === "draft") && <button type="button" onClick={() => submit("draft")} disabled={saving} className="btn-secondary">{saving ? "..." : "Enregistrer le brouillon"}</button>}
          {!isNew && editing.status === "draft" && <button type="button" onClick={() => submit("submitted")} disabled={saving} className="btn-primary">Soumettre</button>}
          {!isNew && editing.status === "submitted" && <button type="button" onClick={() => onDecide(editing, "finance_review")} className="btn-primary px-4 py-2 text-sm">Envoyer en revue finance</button>}
          {!isNew && editing.status === "finance_review" && <button type="button" onClick={() => onDecide(editing, "manager_approval")} className="btn-primary px-4 py-2 text-sm">Transmettre pour approbation</button>}
          {!isNew && editing.status === "manager_approval" && <button type="button" onClick={() => onDecide(editing, "posted")} className="btn-primary px-4 py-2 text-sm">Approuver &amp; poster</button>}
          {!isNew && ["submitted", "finance_review", "manager_approval"].includes(editing.status) && <>
            <button type="button" onClick={() => onDecide(editing, "returned")} className="btn-secondary px-4 py-2 text-sm">Retourner</button>
            <button type="button" onClick={() => onDecide(editing, "rejected")} className="btn-secondary px-4 py-2 text-sm">Rejeter</button>
          </>}
        </div>
      </div>
    </form>
  </div>;
}
