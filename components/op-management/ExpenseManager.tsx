"use client";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect, { type SearchableSelectOption } from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  Activity, BudgetCategory, BudgetLine, CostCenter, Expense, ExpenseCategory, ExpenseEvidence, ExpenseEvidenceCategory,
  ExpenseStatus, OrganizationDonor, OrganizationGrant, OrganizationSupplier, PaymentMethod, PPMResource, ProcurementItem,
  ProjectContract, ProjectFinanceSettings, WBSNode,
} from "@/lib/ppm/types";
import { wbsLeafNodes } from "@/lib/ppm/wbs";
import { buildBudgetCategoryTree, flattenBudgetCategoryTree } from "@/lib/ppm/budget-categories";
import { checkIsSuperAdmin, isFinalStatus } from "@/lib/ppm/lock";

const categoryLabels: Record<ExpenseCategory, { fr: string; en: string }> = {
  personnel: { fr: "Personnel", en: "Personnel" }, consultants: { fr: "Consultants", en: "Consultants" }, travel: { fr: "Voyage", en: "Travel" }, transport: { fr: "Transport", en: "Transport" },
  accommodation: { fr: "Hebergement", en: "Accommodation" }, training: { fr: "Formation", en: "Training" }, workshop: { fr: "Atelier", en: "Workshop" }, supplies: { fr: "Fournitures", en: "Supplies" },
  equipment: { fr: "Equipement", en: "Equipment" }, communication: { fr: "Communication", en: "Communication" }, services: { fr: "Services", en: "Services" }, other: { fr: "Autres", en: "Other" },
};
// Refinement program, Wave 4 (item 30): only these categories normally go through a procurement/
// PO process in NGO practice — Personnel/Travel/Transport/Accommodation/Communication/Training
// never do (confirmed with the user), so a PO is required only here.
const PO_REQUIRED_CATEGORIES: ExpenseCategory[] = ["consultants", "workshop", "supplies", "equipment", "services"];
const paymentMethodLabels: Record<PaymentMethod, { fr: string; en: string }> = {
  cash: { fr: "Especes", en: "Cash" }, bank_transfer: { fr: "Virement", en: "Bank transfer" }, check: { fr: "Cheque", en: "Check" }, mobile_money: { fr: "Mobile money", en: "Mobile money" }, card: { fr: "Carte", en: "Card" }, other: { fr: "Autre", en: "Other" },
};
const statusLabels: Record<ExpenseStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" }, submitted: { fr: "Soumise", en: "Submitted" }, finance_review: { fr: "Revue finance", en: "Finance review" }, manager_approval: { fr: "Approbation manager", en: "Manager approval" },
  posted: { fr: "Postee", en: "Posted" }, returned: { fr: "Retournee", en: "Returned" }, rejected: { fr: "Rejetee", en: "Rejected" }, cancelled: { fr: "Annulee", en: "Cancelled" },
};
const statusTones: Record<ExpenseStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", finance_review: "bg-amber-50 text-amber-800",
  manager_approval: "bg-amber-50 text-amber-800", posted: "bg-mint text-forest", returned: "bg-orange/10 text-orange",
  rejected: "bg-red-50 text-red-700", cancelled: "bg-slate-200 text-slate-500",
};
const evidenceCategoryLabels: Record<ExpenseEvidenceCategory, { fr: string; en: string }> = {
  invoice: { fr: "Facture", en: "Invoice" }, purchase_order: { fr: "Bon de commande", en: "Purchase order" }, contract: { fr: "Contrat", en: "Contract" }, delivery_note: { fr: "Bon de livraison", en: "Delivery note" },
  receipt_note: { fr: "PV de reception", en: "Receipt note" }, mission_order: { fr: "Ordre de mission", en: "Mission order" }, ticket: { fr: "Billet", en: "Ticket" }, mission_report: { fr: "Rapport de mission", en: "Mission report" },
  liquidation: { fr: "Liquidation", en: "Liquidation" }, other: { fr: "Autre", en: "Other" },
};

export default function ExpenseManager({ projectId, initial, budgetLines, wbsNodes, activities, procurementItems, budgetCategories, staff = [], donors, grants, suppliers, financeSettings, costCenters, contracts, projectManagerEmail }: {
  projectId: string; initial: Expense[]; budgetLines: BudgetLine[]; wbsNodes: WBSNode[]; activities: Activity[]; procurementItems: ProcurementItem[]; budgetCategories: BudgetCategory[]; staff?: PPMResource[];
  donors: OrganizationDonor[]; grants: OrganizationGrant[]; suppliers: OrganizationSupplier[]; financeSettings: ProjectFinanceSettings | null; costCenters: CostCenter[]; contracts: ProjectContract[]; projectManagerEmail: string;
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [scope, setScope] = useState<"mine" | "all" | "to_verify" | "to_approve">("all");
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [deciding, setDeciding] = useState<{ row: Expense; nextStatus: ExpenseStatus } | null>(null);
  const [evidence, setEvidence] = useState<ExpenseEvidence[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null));
    checkIsSuperAdmin(supabase).then(setIsSuperAdmin);
  }, []);

  const categoryOptions = useMemo(() => flattenBudgetCategoryTree(buildBudgetCategoryTree(budgetCategories)), [budgetCategories]);
  const categoryById = useMemo(() => new Map(categoryOptions.map(item => [item.id, item])), [categoryOptions]);
  const budgetLineLabelWithCode = (line: BudgetLine) => {
    if (!line.budget_category_id) return line.description;
    const category = categoryById.get(line.budget_category_id);
    if (!category) return line.description;
    const siblings = [...budgetLines].filter(item => item.budget_category_id === line.budget_category_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const index = siblings.findIndex(item => item.id === line.id);
    return `${category.code}.${index + 1} — ${line.description}`;
  };

  const filtered = rows.filter(row => {
    if (scope === "mine") return row.created_by === currentUserId;
    if (scope === "to_verify") return row.status === "submitted" || row.status === "finance_review";
    if (scope === "to_approve") return row.status === "manager_approval";
    return true;
  });

  const budgetLineLabel = (id?: string | null) => budgetLines.find(item => item.id === id)?.description || "—";

  const financialSummary = useMemo(() => {
    const budget = budgetLines.reduce((sum, line) => sum + Number(line.forecast_amount || 0), 0);
    const committed = budgetLines.reduce((sum, line) => sum + Number(line.committed_amount || 0), 0);
    const spent = rows.filter(row => row.status === "posted").reduce((sum, row) => sum + Number(row.amount_incl_tax || 0), 0);
    return { budget, committed, spent, balance: budget - spent, burnRate: budget > 0 ? Math.round((spent / budget) * 100) : 0 };
  }, [budgetLines, rows]);
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

  async function approvePaymentOverride(row: Expense) {
    if (row.status !== "manager_approval" || !row.payment_override_requested) return;
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!projectManagerEmail || user?.email?.toLowerCase() !== projectManagerEmail.toLowerCase()) {
      setMessage(en ? "Only the project manager configured on this project can approve this override." : "Seul le chef de projet configure sur ce projet peut approuver cette derogation."); return;
    }
    const note = prompt(en ? "Project manager approval note (required)" : "Note d'approbation du chef de projet (obligatoire)")?.trim();
    if (!note) return;
    const approver = user.user_metadata?.full_name || user.email || (en ? "Project manager" : "Chef de projet");
    const result = await supabase.from("ppm_expenses").update({ payment_override_approved: true, payment_override_approved_by: approver, payment_override_approved_at: new Date().toISOString(), approval_note: note }).eq("id", row.id).eq("status", "manager_approval").select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    const updated=result.data as Expense; setRows(current=>current.map(item=>item.id===updated.id?updated:item)); setEditing(updated);
    await supabase.from("ppm_history").insert({ entity_type:"expense", entity_id:row.id, actor_id:user.id, action:"Derogation de paiement approuvee par le chef de projet", from_status:row.status, to_status:row.status, note });
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-black text-forest">{en ? "Expenses" : "Depenses"}</h2><p className="text-sm text-slate-500">{filtered.length} {en ? "expense(s)" : "depense(s)"}</p></div>
      <button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New expense" : "Nouvelle depense"}</button>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Forecast budget" : "Prevision (Budget)"}</p><b className="mt-1 block text-xl text-forest">{financialSummary.budget.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Committed" : "Engage"}</p><b className="mt-1 block text-xl text-forest">{financialSummary.committed.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Spent" : "Depense"}</p><b className="mt-1 block text-xl text-forest">{financialSummary.spent.toLocaleString(locale === "en" ? "en-US" : "fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{en ? "Balance / Burn rate" : "Solde / Burn rate"}</p><b className="mt-1 block text-xl text-forest">{financialSummary.balance.toLocaleString(locale === "en" ? "en-US" : "fr-FR")} · {financialSummary.burnRate}%</b></div>
    </div>
    <div className="flex flex-wrap gap-2">
      {([["all", en ? "All" : "Toutes"], ["mine", en ? "My expenses" : "Mes depenses"], ["to_verify", en ? "To verify" : "A verifier"], ["to_approve", en ? "To approve" : "A approuver"]] as const).map(([value, label]) => <button key={value} onClick={() => setScope(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${scope === value ? "bg-forest text-white" : "bg-slate-100 text-slate-600 hover:bg-mint"}`}>{label}</button>)}
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Expense" : "Depense"}</th><th className="p-4">{en ? "Budget line" : "Ligne budgetaire"}</th><th className="p-4">{en ? "Amount incl. tax" : "Montant TTC"}</th><th className="p-4">Date</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {filtered.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.description}</b>{row.category && <p className="mt-1 text-xs text-slate-400">{categoryLabels[row.category][locale]}{row.payee_name ? ` · ${row.payee_name}` : ""}</p>}</td>
            <td className="p-4">{budgetLineLabel(row.budget_line_id)}</td>
            <td className="p-4">{row.amount_incl_tax.toLocaleString(en ? "en-US" : "fr-FR")} {row.transaction_currency}</td>
            <td className="p-4">{row.expense_date ? new Date(row.expense_date).toLocaleDateString(en ? "en-US" : "fr-FR") : "—"}</td>
            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span></td>
            <td className="p-4"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Open" : "Ouvrir"}</button></td>
          </tr>)}
          {!filtered.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No expense." : "Aucune depense."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <ExpenseFormModal
      projectId={projectId} editing={editing} budgetLines={budgetLines} wbsNodes={wbsNodes} activities={activities}
      procurementItems={procurementItems} allExpenses={rows} evidence={evidence} setEvidence={setEvidence}
      budgetLineLabelWithCode={budgetLineLabelWithCode} isSuperAdmin={isSuperAdmin} budgetCategories={budgetCategories} donors={donors} grants={grants} suppliers={suppliers}
      staff={staff} financeSettings={financeSettings} costCenters={costCenters} contracts={contracts}
      onClose={() => setEditing(null)}
      onSaved={row => { setRows(current => current.some(item => item.id === row.id) ? current.map(item => item.id === row.id ? row : item) : [row, ...current]); setEditing(row); }}
      onDecide={(row, nextStatus) => setDeciding({ row, nextStatus })}
      onApproveOverride={approvePaymentOverride}
    />}

    {deciding && <div className="fixed inset-0 z-[160] overflow-y-auto bg-forest/90 p-4">
      <DecisionForm
        deciding={deciding}
        staffOptions={staffOptions}
        onCancel={() => setDeciding(null)}
        onConfirm={async (fields) => {
          setSaving(true);
          setMessage("");
          const supabase = createClient();
          const now = new Date().toISOString();
          const payload: Record<string, unknown> = { status: deciding.nextStatus };
          if (deciding.nextStatus === "posted" && deciding.row.procurement_item_id) {
            const po = procurementItems.find(item => item.id === deciding.row.procurement_item_id);
            const receiptAllowsPayment = ["complete", "received_with_reservations"].includes(po?.receipt_status || "pending_delivery");
            if (!receiptAllowsPayment && !deciding.row.payment_override_approved) {
              setSaving(false); setMessage(en ? "Payment is blocked: receipt is not complete and no manager override has been explicitly approved." : "Paiement bloque : la reception n'est pas complete et aucune derogation manager n'a ete explicitement approuvee."); return;
            }
            const { data: receiptRows } = await supabase.from("ppm_procurement_receipts").select("quantity_ordered,quantity_accepted,status").eq("procurement_item_id", deciding.row.procurement_item_id);
            const ordered = Math.max(0, ...(receiptRows || []).map(row => Number(row.quantity_ordered || 0)));
            const accepted = (receiptRows || []).filter(row => !["rejected","returned_to_supplier"].includes(row.status)).reduce((sum,row)=>sum+Number(row.quantity_accepted||0),0);
            const allowedAmount = ordered > 0 ? Number(po?.awarded_amount || 0) * Math.min(1, accepted / ordered) : Number(po?.awarded_amount || 0);
            const previouslyPaid = rows.filter(row => row.procurement_item_id === deciding.row.procurement_item_id && row.status === "posted" && row.id !== deciding.row.id).reduce((sum,row)=>sum+Number(row.amount_incl_tax||0),0);
            if (Number(deciding.row.amount_incl_tax || 0) > Math.max(0, allowedAmount - previouslyPaid) && !deciding.row.payment_override_approved) {
              setSaving(false); setMessage(en ? "The expense exceeds the value of quantities received and accepted." : "La depense depasse la valeur des quantites recues et acceptees."); return;
            }
          }
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
          // Admin override (item 33): reopening an already-posted expense for correction reverses
          // the rollups it previously contributed, so Budget/Activity/Procurement totals stay correct.
          if (deciding.row.status === "posted" && deciding.nextStatus !== "posted") {
            const amount = Number(updated.converted_amount ?? updated.amount_incl_tax);
            if (updated.budget_line_id) {
              const line = budgetLines.find(item => item.id === updated.budget_line_id);
              await supabase.from("ppm_budget_lines").update({ spent_amount: Math.max(0, Number(line?.spent_amount || 0) - amount) }).eq("id", updated.budget_line_id);
            }
            if (updated.activity_id) {
              const activity = activities.find(item => item.id === updated.activity_id);
              await supabase.from("ppm_activities").update({ actual_expense: Math.max(0, Number(activity?.actual_expense || 0) - amount) }).eq("id", updated.activity_id);
            }
          }
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Depense ${statusLabels[updated.status].fr.toLowerCase()} — ${updated.description}`, from_status: deciding.row.status, to_status: updated.status, note: fields.note || undefined });
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

function DecisionForm({ deciding, staffOptions, onCancel, onConfirm, saving, message }: {
  deciding: { row: Expense; nextStatus: ExpenseStatus }; staffOptions: SearchableSelectOption[]; onCancel: () => void;
  onConfirm: (fields: { name: string; note: string }) => void; saving: boolean; message: string;
}) {
  const { locale, en } = usePpmLocale();
  return <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); onConfirm({ name: String(form.get("name") || ""), note: String(form.get("note") || "") }); }} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
    <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{statusLabels[deciding.nextStatus][locale]} — {deciding.row.description}</h2><button type="button" onClick={onCancel} className="text-2xl">×</button></div>
    <div className="mt-5 grid gap-4">
      <label className="grid gap-2 text-sm font-bold">{en ? "Name" : "Nom"}<SearchableSelect name="name" options={staffOptions} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
      <label className="grid gap-2 text-sm font-bold">{en ? "Comment" : "Commentaire"}<textarea name="note" rows={3} className="admin-input" /></label>
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Confirm" : "Confirmer")}</button></div>
    </div>
  </form>;
}

function ExpenseFormModal({ projectId, editing, budgetLines, wbsNodes, activities, procurementItems, allExpenses, evidence, setEvidence, budgetLineLabelWithCode, isSuperAdmin, budgetCategories, donors, grants, suppliers, staff, financeSettings, costCenters, contracts, onClose, onSaved, onDecide, onApproveOverride }: {
  projectId: string; editing: Expense | "new"; budgetLines: BudgetLine[]; wbsNodes: WBSNode[]; activities: Activity[]; procurementItems: ProcurementItem[];
  allExpenses: Expense[]; evidence: ExpenseEvidence[]; setEvidence: (rows: ExpenseEvidence[]) => void;
  budgetLineLabelWithCode: (line: BudgetLine) => string; isSuperAdmin: boolean; budgetCategories: BudgetCategory[];
  donors: OrganizationDonor[]; grants: OrganizationGrant[]; suppliers: OrganizationSupplier[]; staff: PPMResource[];
  financeSettings: ProjectFinanceSettings | null; costCenters: CostCenter[]; contracts: ProjectContract[];
  onClose: () => void; onSaved: (row: Expense) => void; onDecide: (row: Expense, nextStatus: ExpenseStatus) => void; onApproveOverride: (row: Expense) => void;
}) {
  const { locale, en } = usePpmLocale();
  const isNew = editing === "new";
  const formRef = useRef<HTMLFormElement>(null);
  const [budgetLineId, setBudgetLineId] = useState(isNew ? "" : editing.budget_line_id || "");
  const [category, setCategory] = useState<ExpenseCategory | "">(isNew ? "" : editing.category || "");
  const [procurementItemId, setProcurementItemId] = useState(isNew ? "" : editing.procurement_item_id || "");
  const [donorId, setDonorId] = useState(isNew ? "" : editing.donor_id || "");
  const [grantId, setGrantId] = useState(isNew ? "" : editing.grant_id || "");
  const [costCenterId, setCostCenterId] = useState(isNew ? "" : editing.cost_center_id || "");
  const [payeeType, setPayeeType] = useState<"supplier" | "staff" | "other">(isNew ? "supplier" : editing.payee_type || "supplier");
  const [payeeId, setPayeeId] = useState(isNew ? "" : editing.payee_id || "");
  const [contractId, setContractId] = useState(isNew ? "" : editing.contract_id || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(isNew ? "" : editing.payment_method || "");
  const [wpAllocations, setWpAllocations] = useState<Record<string, number>>(() => isNew ? {} : Object.fromEntries((editing.work_package_allocations || []).map(x => [x.work_package_id, x.percentage])));
  const [amountExclTax, setAmountExclTax] = useState(isNew ? "" : String(editing.amount_excl_tax ?? ""));
  const [taxAmount, setTaxAmount] = useState(isNew ? "" : String(editing.tax_amount ?? ""));
  const [manualTtc, setManualTtc] = useState(false);
  const [amountInclTax, setAmountInclTax] = useState(isNew ? "" : String(editing.amount_incl_tax ?? ""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Refinement program, Wave 4 (item 31): TTC = HT + Taxes, computed live — still overridable via
  // "Saisir manuellement" for edge-case rounding, matching the plan's explicit allowance for that.
  const computedTtc = Number(amountExclTax || 0) + Number(taxAmount || 0);
  useEffect(() => { if (!manualTtc) setAmountInclTax(String(computedTtc)); }, [computedTtc, manualTtc]);
  const poRequired = category !== "" && PO_REQUIRED_CATEGORIES.includes(category as ExpenseCategory);
  const budgetLine = budgetLines.find(item => item.id === budgetLineId);
  const budgetLineRemaining = (line: BudgetLine) => {
    const approved = Number(line.revised_budget ?? line.forecast_amount ?? line.initial_budget ?? 0);
    const committed = Number(line.committed_amount || 0);
    const spent = allExpenses.filter(item => item.budget_line_id === line.id && item.status === "posted" && item.id !== (isNew ? "" : editing.id)).reduce((sum, item) => sum + Number(item.converted_amount ?? item.amount_incl_tax), 0);
    return approved - committed - spent;
  };
  const categoryTree = flattenBudgetCategoryTree(buildBudgetCategoryTree(budgetCategories));
  const selectedBudgetCategory = categoryTree.find(item => item.id === budgetLine?.budget_category_id);
  const filteredGrants = grants.filter(item => item.donor_id === donorId && item.status === "active");
  const activeCenters = costCenters.filter(item => item.status === "active");
  const payeeContracts = contracts.filter(item => item.status === "active" && item.party_type === payeeType && (!item.party_id || item.party_id === payeeId));
  useEffect(() => { if (payeeContracts.length === 1) setContractId(payeeContracts[0].id); else if (!payeeContracts.some(item => item.id === contractId)) setContractId(""); }, [payeeId, payeeType]);
  const availablePoItems = procurementItems.filter(item => !!item.po_reference && item.budget_line_id === budgetLineId && item.stage !== "cancelled" && item.payment_status !== "paid");
  const poRemaining = (item: ProcurementItem) => Number(item.awarded_amount || 0) - allExpenses.filter(expense => expense.procurement_item_id === item.id && !["rejected", "cancelled"].includes(expense.status) && expense.id !== (isNew ? "" : editing.id)).reduce((sum, expense) => sum + Number(expense.amount_incl_tax || 0), 0);
  const selectedPo = availablePoItems.find(item => item.id === procurementItemId);
  const allocationTotal = Object.values(wpAllocations).reduce((sum, value) => sum + Number(value || 0), 0);
  const allocationRows = Object.entries(wpAllocations).map(([work_package_id, percentage]) => ({ work_package_id, percentage: Number(percentage), amount: Number(amountInclTax || 0) * Number(percentage) / 100 }));

  useEffect(() => {
    if (!budgetLine) return;
    const allocations = budgetLine.wbs_allocations?.length ? budgetLine.wbs_allocations : budgetLine.wbs_node_id ? [{ work_package_id: budgetLine.wbs_node_id, percentage: 100 }] : [];
    setWpAllocations(Object.fromEntries(allocations.map(item => [item.work_package_id, Number(item.percentage)])));
    setDonorId(budgetLine.donor_id || "");
    setGrantId(budgetLine.grant_id || "");
    setCostCenterId(budgetLine.cost_center_id || activeCenters.find(item => item.is_default)?.id || "");
    if (budgetLine.cost_category && budgetLine.cost_category in categoryLabels) setCategory(budgetLine.cost_category as ExpenseCategory);
    setProcurementItemId("");
  }, [budgetLineId]);


  const budgetCheck = useMemo(() => {
    if (!budgetLine) return null;
    const approved = Number(budgetLine.revised_budget ?? budgetLine.forecast_amount ?? budgetLine.initial_budget ?? 0);
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

  // Refinement program, Wave 4 (item 32): evidence can be replaced/deleted before submission —
  // restricted to draft so a submitted/reviewed expense's audit trail stays intact.
  async function deleteEvidence(item: ExpenseEvidence) {
    if (!confirm(en ? "Delete this piece of evidence?" : "Supprimer cette piece justificative ?")) return;
    const supabase = createClient();
    if (item.file_path) await supabase.storage.from("document-vault").remove([item.file_path]);
    const result = await supabase.from("ppm_expense_evidence").delete().eq("id", item.id);
    if (!result.error) setEvidence(evidence.filter(row => row.id !== item.id));
  }

  async function submit(nextStatus: ExpenseStatus) {
    if (!formRef.current) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(formRef.current);
    if (budgetCheck && budgetCheck.availableAfter < 0 && !String(form.get("over_budget_justification") || "").trim() && nextStatus !== "draft") {
      setSaving(false); setMessage(en ? "This expense exceeds the available budget: a justification is required." : "Cette depense depasse le disponible budgetaire : une justification est obligatoire."); return;
    }
    if (poRequired && !procurementItemId && nextStatus !== "draft") {
      setSaving(false); setMessage(en ? "An existing PO (purchase order) is required for this expense category." : "Un PO (bon de commande) existant est obligatoire pour cette categorie de depense."); return;
    }
    if (Math.abs(allocationTotal - 100) > 0.01 && nextStatus !== "draft") {
      setSaving(false); setMessage(en ? "Work Package percentages must total 100%." : "Les pourcentages des Work Packages doivent totaliser 100 %."); return;
    }
    if (selectedPo && Number(amountInclTax || 0) > poRemaining(selectedPo)) {
      setSaving(false); setMessage(en ? "The expense exceeds the remaining purchase order amount." : "La depense depasse le montant restant du bon de commande."); return;
    }
    if (financeSettings?.cost_centers_enabled && financeSettings.cost_center_required && !costCenterId && nextStatus !== "draft") {
      setSaving(false); setMessage(en ? "A cost centre is required for this project." : "Le centre de cout est obligatoire pour ce projet."); return;
    }
    const selectedPoItem = procurementItems.find(item => item.id === procurementItemId);
    const exchangeRate = Number(form.get("exchange_rate") || 1);
    const payload = {
      project_id: projectId,
      work_package_id: allocationRows[0]?.work_package_id || null,
      activity_id: null,
      work_package_allocations: allocationRows,
      budget_line_id: budgetLineId || null,
      procurement_item_id: procurementItemId || null,
      donor_id: donorId || null,
      donor_name: donors.find(item => item.id === donorId)?.name || null,
      grant_id: grantId || null,
      grant_reference: grants.find(item => item.id === grantId)?.reference || null,
      cost_center_id: costCenterId || null,
      cost_center: costCenters.find(item => item.id === costCenterId)?.code || null,
      expense_date: String(form.get("expense_date") || "") || null,
      category: category || null,
      sub_category: selectedBudgetCategory?.title || budgetLine?.sub_category || null,
      description: String(form.get("description") || "").trim(),
      justification: String(form.get("justification") || "").trim() || null,
      payee_type: payeeType,
      payee_id: payeeId || null,
      payee_name: payeeType === "supplier" ? suppliers.find(item => item.id === payeeId)?.name || null : payeeType === "staff" ? staff.find(item => item.id === payeeId)?.name || null : String(form.get("payee_name") || "").trim() || null,
      location: String(form.get("location") || "").trim() || null,
      amount_excl_tax: Number(amountExclTax || 0),
      tax_amount: Number(taxAmount || 0),
      amount_incl_tax: Number(amountInclTax || 0),
      transaction_currency: String(form.get("transaction_currency") || "XAF"),
      project_currency: String(form.get("project_currency") || "XAF"),
      exchange_rate: exchangeRate,
      converted_amount: Number(amountInclTax || 0) * exchangeRate,
      payment_method: paymentMethod || null,
      payment_account_reference: String(form.get("payment_account_reference") || "").trim() || null,
      payment_date: String(form.get("payment_date") || "") || null,
      transaction_reference: String(form.get("transaction_reference") || "").trim() || null,
      invoice_number: String(form.get("invoice_number") || "").trim() || null,
      invoice_date: String(form.get("invoice_date") || "") || null,
      po_reference: selectedPoItem?.po_reference || null,
      contract_id: contractId || null,
      contract_reference: String(form.get("contract_reference") || "").trim() || contracts.find(item => item.id === contractId)?.contract_number || null,
      supplier_name: payeeType === "supplier" ? suppliers.find(item => item.id === payeeId)?.name || null : null,
      over_budget_justification: String(form.get("over_budget_justification") || "").trim() || null,
      payment_override_requested: form.get("payment_override_requested") === "on",
      payment_override_reason: String(form.get("payment_override_reason") || "").trim() || null,
      status: nextStatus,
      submitted_at: nextStatus === "submitted" ? new Date().toISOString() : (isNew ? null : editing.submitted_at) || null,
    };
    if (!payload.description) { setSaving(false); setMessage(en ? "Description is required." : "La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = isNew
      ? await supabase.from("ppm_expenses").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_expenses").update(payload).eq("id", editing.id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    onSaved(result.data as Expense);
  }

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <form ref={formRef} onSubmit={event => event.preventDefault()} className="mx-auto my-10 max-w-3xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{isNew ? (en ? "New expense" : "Nouvelle depense") : (en ? "Expense" : "Depense")}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Referencing" : "Referencement"}</h3>
        <label className="grid gap-2 text-sm font-bold">{en ? "Budget line" : "Ligne budgetaire"} *<select value={budgetLineId} onChange={event => setBudgetLineId(event.target.value)} required className="admin-input"><option value="">{en ? "Select..." : "Selectionner..."}</option>{budgetLines.filter(item => item.status === "approved").map(item => <option key={item.id} value={item.id}>{budgetLineLabelWithCode(item)} ({en ? "remaining" : "reste"}: {budgetLineRemaining(item).toLocaleString(en ? "en-US" : "fr-FR")} {item.currency})</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "PO (purchase order)" : "PO (bon de commande)"}{poRequired && " *"}<select value={procurementItemId} onChange={event => setProcurementItemId(event.target.value)} required={poRequired} disabled={!budgetLineId} className="admin-input"><option value="">{availablePoItems.length ? (en ? "Select..." : "Selectionner...") : (en ? "No active PO for this budget line" : "Aucun PO actif pour cette ligne budgetaire")}</option>{availablePoItems.map(item => <option key={item.id} value={item.id}>{item.po_reference} - {item.title} ({en ? "remaining" : "reste"}: {poRemaining(item).toLocaleString(en ? "en-US" : "fr-FR")} {item.currency || ""})</option>)}</select></label>
        {selectedPo && <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:col-span-2 sm:grid-cols-2"><p className="grid gap-1 text-sm font-bold">{en ? "PO receipt status" : "Statut de reception du PO"}<span className="admin-input bg-slate-100">{selectedPo.receipt_status || "pending_delivery"}</span></p><p className="grid gap-1 text-sm font-bold">{en ? "Remaining committed amount" : "Montant engage restant"}<span className="admin-input bg-slate-100">{poRemaining(selectedPo).toLocaleString(en ? "en-US" : "fr-FR")} {selectedPo.currency}</span></p>{!["complete","received_with_reservations"].includes(selectedPo.receipt_status || "pending_delivery") && <div className="rounded-xl bg-amber-50 p-3 sm:col-span-2"><label className="flex items-center gap-2 text-sm font-bold"><input name="payment_override_requested" type="checkbox" defaultChecked={!isNew && editing.payment_override_requested}/>{en ? "Request project manager exceptional payment authorization" : "Solliciter une derogation de paiement du chef de projet"}</label><textarea name="payment_override_reason" rows={2} defaultValue={isNew ? "" : editing.payment_override_reason || ""} placeholder={en ? "Mandatory justification for the override" : "Justification obligatoire de la derogation"} className="admin-input mt-2"/></div>}</div>}

        <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select value={budgetLine?.budget_category_id || ""} disabled className="admin-input disabled:bg-slate-50"><option value="">{en ? "Filled from budget line" : "Renseignee depuis la ligne budgetaire"}</option>{categoryTree.map(item => <option key={item.id} value={item.id}>{item.code} - {item.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Sub-category" : "Sous-categorie"}<select value={selectedBudgetCategory?.id || ""} disabled className="admin-input disabled:bg-slate-50"><option value="">-</option>{selectedBudgetCategory && <option value={selectedBudgetCategory.id}>{selectedBudgetCategory.title}</option>}</select></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<input name="description" defaultValue={isNew ? "" : editing.description} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Justification" : "Justification"}<textarea name="justification" rows={2} defaultValue={isNew ? "" : editing.justification || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Cost centre" : "Centre de cout"}{financeSettings?.cost_centers_enabled && financeSettings.cost_center_required && " *"}<select value={costCenterId} onChange={event => setCostCenterId(event.target.value)} required={!!financeSettings?.cost_centers_enabled && !!financeSettings.cost_center_required} disabled={!financeSettings?.cost_centers_enabled} className="admin-input"><option value="">{financeSettings?.cost_centers_enabled ? (en ? "Select..." : "Selectionner...") : (en ? "Cost centres disabled for this project" : "Centres de cout desactives pour ce projet")}</option>{activeCenters.map(item => <option key={item.id} value={item.id}>{item.code} - {item.label}{item.is_default ? (en ? " (default)" : " (par defaut)") : ""}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Expense date" : "Date de depense"}<input name="expense_date" type="date" defaultValue={isNew ? "" : editing.expense_date || ""} className="admin-input" /></label>

        <fieldset className="rounded-xl border p-3 sm:col-span-2"><legend className="px-1 text-sm font-bold">{en ? "Work Packages and allocation" : "Work Packages et ventilation"} ({allocationTotal}%)</legend><p className="mb-3 text-xs text-slate-500">{en ? "Percentages are prefilled from the selected budget line. Amounts are calculated from the total expense." : "Les pourcentages proviennent de la ligne budgetaire. Les montants sont calcules sur la depense totale."}</p><div className="grid gap-2">{wbsLeafNodes(wbsNodes).map(item => <div key={item.id} className="grid items-center gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[auto_1fr_110px_150px]"><input type="checkbox" checked={item.id in wpAllocations} onChange={event => setWpAllocations(current => { const next={...current}; if(event.target.checked) next[item.id]=0; else delete next[item.id]; return next; })}/><span className="text-xs font-bold">{item.title}</span>{item.id in wpAllocations && <><label className="flex items-center gap-1 text-xs"><input type="number" min="0" max="100" step="0.01" value={wpAllocations[item.id]} onChange={event => setWpAllocations(current => ({...current,[item.id]:Number(event.target.value)}))} className="admin-input"/>%</label><b className="text-right text-xs text-forest">{(Number(amountInclTax || 0) * Number(wpAllocations[item.id] || 0) / 100).toLocaleString(en ? "en-US" : "fr-FR")}</b></>}</div>)}</div><p className={`mt-2 text-xs font-bold ${Math.abs(allocationTotal-100)<0.01?"text-leaf":"text-orange"}`}>{en ? "Required total: 100%" : "Total requis : 100 %"}</p></fieldset>

        <label className="grid gap-2 text-sm font-bold">{en ? "Donor" : "Bailleur Donateur"}<select value={donorId} onChange={event => { const next=event.target.value; setDonorId(next); const matches=grants.filter(item=>item.donor_id===next&&item.status==="active"); setGrantId(matches.length===1?matches[0].id:""); }} className="admin-input"><option value="">-</option>{donors.filter(item => item.status === "active").map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ""}{item.name}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Grant<select value={grantId} onChange={event => setGrantId(event.target.value)} disabled={!donorId} className="admin-input"><option value="">{filteredGrants.length > 1 ? (en ? "Select..." : "Selectionner...") : "-"}</option>{filteredGrants.map(item => <option key={item.id} value={item.id}>{item.reference}{item.title ? ` - ${item.title}` : ""}</option>)}</select></label>

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Payee and contract" : "Beneficiaire et contrat"}</h3>
        <label className="grid gap-2 text-sm font-bold">{en ? "Payee type" : "Type de beneficiaire"}<select value={payeeType} onChange={event => { setPayeeType(event.target.value as typeof payeeType); setPayeeId(""); setContractId(""); }} className="admin-input"><option value="supplier">{en ? "Supplier" : "Fournisseur"}</option><option value="staff">{en ? "Staff beneficiary" : "Beneficiaire staff"}</option><option value="other">{en ? "Other beneficiary" : "Autre beneficiaire"}</option></select></label>
        {payeeType === "supplier" ? <label className="grid gap-2 text-sm font-bold">{en ? "Supplier" : "Fournisseur"}<select value={payeeId} onChange={event => setPayeeId(event.target.value)} className="admin-input"><option value="">-</option>{suppliers.filter(item => item.status === "active").map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ""}{item.name}</option>)}</select></label> : payeeType === "staff" ? <label className="grid gap-2 text-sm font-bold">Staff<select value={payeeId} onChange={event => setPayeeId(event.target.value)} className="admin-input"><option value="">-</option>{staff.map(item => <option key={item.id} value={item.id}>{item.name}{item.role_title ? ` - ${item.role_title}` : ""}</option>)}</select></label> : <label className="grid gap-2 text-sm font-bold">{en ? "Other beneficiary" : "Autre beneficiaire a preciser"}<input name="payee_name" defaultValue={!isNew && editing.payee_type === "other" ? editing.payee_name || "" : ""} className="admin-input"/></label>}
        {payeeType === "other" ? <label className="grid gap-2 text-sm font-bold">{en ? "Contract no. (optional)" : "Contrat N* (facultatif)"}<input name="contract_reference" defaultValue={isNew ? "" : editing.contract_reference || ""} className="admin-input"/></label> : <label className="grid gap-2 text-sm font-bold">{en ? "Contract no." : "Contrat N*"}<select value={contractId} onChange={event => setContractId(event.target.value)} disabled={!payeeId} className="admin-input"><option value="">-</option>{payeeContracts.map(item => <option key={item.id} value={item.id}>{item.contract_number}{item.title ? ` - ${item.title}` : ""}</option>)}</select></label>}
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Location" : "Lieu"}<input name="location" defaultValue={isNew ? "" : editing.location || ""} className="admin-input" /></label>

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Financial information" : "Informations financieres"}</h3>
        <label className="grid gap-2 text-sm font-bold">{en ? "Amount excl. tax" : "Montant HT"}<input type="number" min="0" step="0.01" value={amountExclTax} onChange={event => setAmountExclTax(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Tax" : "Taxes"}<input type="number" min="0" step="0.01" value={taxAmount} onChange={event => setTaxAmount(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Amount incl. tax" : "Montant TTC"} {!manualTtc && <span className="font-normal text-slate-400">{en ? "(computed automatically)" : "(calcule automatiquement)"}</span>}<input type="number" min="0" step="0.01" value={amountInclTax} disabled={!manualTtc} onChange={event => setAmountInclTax(event.target.value)} className="admin-input disabled:bg-slate-50" /><span className="flex items-center gap-2 text-xs font-normal text-slate-500"><input type="checkbox" checked={manualTtc} onChange={event => setManualTtc(event.target.checked)} />{en ? "Enter manually" : "Saisir manuellement"}</span></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Transaction currency" : "Devise transaction"}<input name="transaction_currency" defaultValue={isNew ? "XAF" : editing.transaction_currency || "XAF"} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Project currency" : "Devise projet"}<input name="project_currency" defaultValue={isNew ? "XAF" : editing.project_currency || "XAF"} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Exchange rate" : "Taux de change"}<input name="exchange_rate" type="number" min="0" step="0.0001" defaultValue={isNew ? 1 : editing.exchange_rate ?? 1} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Payment method" : "Mode de paiement"}<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)} className="admin-input"><option value="">-</option>{Object.entries(paymentMethodLabels).map(([value,label])=><option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{paymentMethod === "check" ? (en ? "Check number" : "Numero du cheque") : paymentMethod === "bank_transfer" ? (en ? "Bank account" : "Compte bancaire") : paymentMethod === "mobile_money" ? (en ? "Mobile Money account (country code)" : "Compte Mobile Money (avec indicatif pays)") : paymentMethod === "cash" ? (en ? "Payment receipt order no." : "N* d'ordre du recu de paiement") : (en ? "Payment account / reference" : "Compte / reference de paiement")}<input name="payment_account_reference" defaultValue={isNew ? "" : editing.payment_account_reference || ""} className="admin-input"/></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Payment date" : "Date de paiement"}<input name="payment_date" type="date" defaultValue={isNew ? "" : editing.payment_date || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Transaction reference (unique transaction ID, transfer order, receipt or Mobile Money transaction no.)" : "Reference transaction (ID unique, N* ordre de virement, N* recu ou N* transaction Mobile Money)"}<input name="transaction_reference" defaultValue={isNew ? "" : editing.transaction_reference || ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Invoice number (optional)" : "Numero facture (facultatif)"}<input name="invoice_number" defaultValue={isNew ? "" : editing.invoice_number || ""} className="admin-input" /><span className="text-xs font-normal text-slate-500">{en ? "Invoice submitted mainly by a supplier or qualified professional." : "Numero de la facture soumise principalement par un fournisseur ou un professionnel qualifie."}</span></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Invoice date" : "Date facture"}<input name="invoice_date" type="date" defaultValue={isNew ? "" : editing.invoice_date || ""} className="admin-input" /></label>

        {budgetCheck && <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Budget check" : "Controle budgetaire"}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <p>{en ? "Approved budget" : "Budget approuve"} : <b>{budgetCheck.approved.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
            <p>{en ? "Committed" : "Engagements"} : <b>{budgetCheck.committed.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
            <p>{en ? "Validated expenses" : "Depenses validees"} : <b>{budgetCheck.alreadySpent.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
            <p>{en ? "Current expense" : "Depense actuelle"} : <b>{budgetCheck.current.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
            <p>{en ? "Available before" : "Disponible avant"} : <b>{budgetCheck.availableBefore.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
            <p className={budgetCheck.availableAfter < 0 ? "text-red-600" : ""}>{en ? "Available after" : "Disponible apres"} : <b>{budgetCheck.availableAfter.toLocaleString(en ? "en-US" : "fr-FR")}</b></p>
          </div>
          {budgetCheck.availableAfter < 0 && <div className="mt-3 rounded-xl bg-red-50 p-3">
            <p className="font-bold text-red-700">⚠ {en ? "This expense exceeds the available budget." : "Cette depense depasse le disponible budgetaire."}</p>
            <textarea name="over_budget_justification" rows={2} placeholder={en ? "Justification required" : "Justification obligatoire"} defaultValue={isNew ? "" : editing.over_budget_justification || ""} className="admin-input mt-2" />
          </div>}
        </div>}

        <h3 className="text-sm font-black uppercase text-slate-400 sm:col-span-2">{en ? "Supporting evidence" : "Pieces justificatives"}</h3>
        {!isNew ? <div className="sm:col-span-2 grid gap-2">
          {editing.status === "draft" && <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{en ? "Add a document" : "Ajouter une piece"}<input type="file" onChange={uploadEvidence} className="hidden" /></label>}
          {evidence.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2 text-sm">
            <span>{evidenceCategoryLabels[item.category][locale]} — {item.title}</span>
            <div className="flex items-center gap-3">
              {item.file_path && <button type="button" onClick={() => viewEvidence(item.file_path)} className="text-xs font-bold text-leaf">{en ? "View" : "Voir"}</button>}
              {editing.status === "draft" && <button type="button" onClick={() => deleteEvidence(item)} aria-label={en ? "Delete" : "Supprimer"}><TrashIcon className="h-4 text-red-600" /></button>}
            </div>
          </div>)}
        </div> : <p className="text-sm text-slate-400 sm:col-span-2">{en ? "Save a draft first to be able to add documents." : "Enregistrez d'abord un brouillon pour pouvoir ajouter des pieces."}</p>}

        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex flex-wrap justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary">{en ? "Close" : "Fermer"}</button>
          {(isNew || editing.status === "draft") && <button type="button" onClick={() => submit("draft")} disabled={saving} className="btn-secondary">{saving ? "..." : (en ? "Save draft" : "Enregistrer le brouillon")}</button>}
          {!isNew && editing.status === "draft" && <button type="button" onClick={() => submit("submitted")} disabled={saving} className="btn-primary">{en ? "Submit" : "Soumettre"}</button>}
          {!isNew && editing.status === "submitted" && <button type="button" onClick={() => onDecide(editing, "finance_review")} className="btn-primary px-4 py-2 text-sm">{en ? "Send to finance review" : "Envoyer en revue finance"}</button>}
          {!isNew && editing.status === "finance_review" && <button type="button" onClick={() => onDecide(editing, "manager_approval")} className="btn-primary px-4 py-2 text-sm">{en ? "Submit for approval" : "Transmettre pour approbation"}</button>}
          {!isNew && editing.status === "manager_approval" && editing.payment_override_requested && !editing.payment_override_approved && <button type="button" onClick={() => onApproveOverride(editing)} className="btn-secondary px-4 py-2 text-sm">{en ? "Grant payment override" : "Accorder la derogation de paiement"}</button>}
          {!isNew && editing.status === "manager_approval" && <button type="button" onClick={() => onDecide(editing, "posted")} className="btn-primary px-4 py-2 text-sm">{en ? "Approve & post" : "Approuver & poster"}</button>}
          {!isNew && ["submitted", "finance_review", "manager_approval"].includes(editing.status) && <>
            <button type="button" onClick={() => onDecide(editing, "returned")} className="btn-secondary px-4 py-2 text-sm">{en ? "Return" : "Retourner"}</button>
            <button type="button" onClick={() => onDecide(editing, "rejected")} className="btn-secondary px-4 py-2 text-sm">{en ? "Reject" : "Rejeter"}</button>
          </>}
          {!isNew && isFinalStatus("expense", editing.status) && isSuperAdmin && <button type="button" onClick={() => onDecide(editing, "returned")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600">{en ? "Return for correction (admin)" : "Retourner pour correction (admin)"}</button>}
        </div>
      </div>
    </form>
  </div>;
}
