"use client";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getOrgCodeForProject, withUniqueRegistryCode, generateSequenceCode } from "@/lib/ppm/ids";
import { checkIsSuperAdmin, isFinalStatus } from "@/lib/ppm/lock";
import { notifyPpmEventClient } from "@/lib/ppm/notify-client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  BudgetLine, CostCenter, OrganizationSupplier, PPMResource, ProcurementAcceptanceCriterion, ProcurementCategory, ProcurementItem, ProcurementMethod, ProcurementStage,
  ProjectContract, ReceiptQualityAssessment, WBSNode,
} from "@/lib/ppm/types";

const qualityAssessmentLabels: Record<ReceiptQualityAssessment, { fr: string; en: string }> = { conforme: { fr: "Conforme", en: "Compliant" }, non_conforme: { fr: "Non conforme", en: "Non-compliant" }, partiellement_conforme: { fr: "Partiellement conforme", en: "Partially compliant" } };

const STAGES: ProcurementStage[] = ["need", "request", "package", "solicitation", "evaluation", "award", "contract", "delivery", "receipt", "invoice", "payment", "completed"];
const stageLabels: Record<ProcurementStage, { fr: string; en: string }> = {
  need: { fr: "Besoin", en: "Need" }, request: { fr: "Demande", en: "Request" }, package: { fr: "Lot", en: "Package" }, solicitation: { fr: "RFQ/RFP/Tender", en: "RFQ/RFP/Tender" }, evaluation: { fr: "Evaluation", en: "Evaluation" },
  award: { fr: "Attribution", en: "Award" }, contract: { fr: "Contrat/PO", en: "Contract/PO" }, delivery: { fr: "Livraison", en: "Delivery" }, receipt: { fr: "Reception", en: "Receipt" }, invoice: { fr: "Facture", en: "Invoice" },
  payment: { fr: "Paiement", en: "Payment" }, completed: { fr: "Termine", en: "Completed" }, cancelled: { fr: "Annule", en: "Cancelled" },
};
const categoryLabels: Record<ProcurementCategory, { fr: string; en: string }> = { goods: { fr: "Biens", en: "Goods" }, works: { fr: "Travaux", en: "Works" }, services: { fr: "Services", en: "Services" }, consultancy: { fr: "Consultance", en: "Consultancy" } };
const methodLabels: Record<ProcurementMethod, { fr: string; en: string }> = { direct: { fr: "Gre a gre", en: "Direct" }, rfq: { fr: "RFQ", en: "RFQ" }, rfp: { fr: "RFP", en: "RFP" }, tender: { fr: "Appel d'offres", en: "Tender" } };

export default function ProcurementPipeline({ projectId, initial, wbsNodes, staff = [], budgetLines, costCenters, suppliers, contracts }: { projectId: string; initial: ProcurementItem[]; wbsNodes: WBSNode[]; staff?: PPMResource[]; budgetLines: BudgetLine[]; costCenters: CostCenter[]; suppliers: OrganizationSupplier[]; contracts: ProjectContract[] }) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<ProcurementItem | "new" | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<ProcurementAcceptanceCriterion[]>([]);
  const [receivingFor, setReceivingFor] = useState<ProcurementItem | null>(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const budgetLineRemaining = (line: BudgetLine) => Number(line.revised_budget ?? line.forecast_amount ?? line.initial_budget ?? 0) - Number(line.committed_amount || 0) - Number(line.spent_amount || 0);

  useEffect(() => { checkIsSuperAdmin(createClient()).then(setIsSuperAdmin); }, []);
  const supplierContracts = contracts.filter(item => item.status === "active" && item.party_type === "supplier" && (!item.party_id || item.party_id === supplierId));
  function openEditor(row: ProcurementItem | "new") {
    setEditing(row);
    setMessage("");
    setSupplierId(row === "new" ? "" : row.supplier_id || suppliers.find(item => item.name === row.supplier_name)?.id || "");
    setAcceptanceCriteria(row === "new" ? [] : row.acceptance_criteria || []);
  }
  function addCriterion() {
    setAcceptanceCriteria(current => [...current, { id: `AC-${String(current.length + 1).padStart(3, "0")}`, title: "", specification: "" }]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      work_package_id: String(form.get("work_package_id") || "") || null,
      budget_line_id: String(form.get("budget_line_id") || "") || null,
      cost_center_id: String(form.get("cost_center_id") || "") || null,
      supplier_id: supplierId || null,
      contract_id: String(form.get("contract_id") || "") || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      category: String(form.get("category") || "goods") as ProcurementCategory,
      procurement_method: String(form.get("procurement_method") || "rfq") as ProcurementMethod,
      estimated_value: form.get("estimated_value") ? Number(form.get("estimated_value")) : null,
      currency: String(form.get("currency") || "XAF"),
      requested_by_name: String(form.get("requested_by_name") || "").trim() || null,
      requested_by_email: String(form.get("requested_by_email") || "").trim() || null,
      supplier_name: suppliers.find(item => item.id === supplierId)?.name || null,
      contract_reference: contracts.find(item => item.id === String(form.get("contract_id") || ""))?.contract_number || null,
      acceptance_criteria: acceptanceCriteria.filter(item => item.title.trim()).map(item => ({ ...item, title: item.title.trim(), specification: item.specification.trim() })),
      awarded_amount: form.get("awarded_amount") ? Number(form.get("awarded_amount")) : null,
      delivery_date: String(form.get("delivery_date") || "") || null,
      notes: String(form.get("notes") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_procurement_items").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_procurement_items").update(payload).eq("id", (editing as ProcurementItem).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as ProcurementItem, ...current] : current.map(row => row.id === result.data.id ? result.data as ProcurementItem : row));
    setEditing(null);
  }

  async function advance(row: ProcurementItem, forcedNextStage?: ProcurementStage) {
    const index = STAGES.indexOf(row.stage);
    if (!forcedNextStage && (index < 0 || index >= STAGES.length - 1)) return;
    const nextStage = forcedNextStage || STAGES[index + 1];
    const supabase = createClient();

    // Refinement program, Wave 4 (item 30): the moment a request is verified/validated into the
    // "award" stage, an 8-character PO is generated automatically — this is the Besoin -> verifie
    // -> valide chain the user described, expressed through the pipeline's existing stages.
    const needsPo = nextStage === "award" && !row.po_reference;
    let issuedPo: string | null = null;
    let result: { data: ProcurementItem | null; error: { code?: string; message: string } | null };
    if (needsPo) {
      const orgCode = await getOrgCodeForProject(supabase, projectId);
      result = await withUniqueRegistryCode<ProcurementItem>(
        async code => await supabase.from("ppm_procurement_items").update({ stage: nextStage, po_reference: code }).eq("id", row.id).select("*").single(),
        () => generateSequenceCode(orgCode),
      );
      if (!result.error) issuedPo = result.data?.po_reference || null;
    } else {
      result = await supabase.from("ppm_procurement_items").update({ stage: nextStage }).eq("id", row.id).select("*").single();
    }

    if (!result.error) {
      setRows(current => current.map(item => item.id === row.id ? result.data as ProcurementItem : item));
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Procurement — ${row.title}`, from_status: row.stage, to_status: nextStage });
      if (issuedPo && row.requested_by_email) {
        await notifyPpmEventClient({
          recipient: { email: row.requested_by_email },
          projectId, category: "approval",
          titleFr: `PO emis — ${row.title}`, titleEn: `PO issued — ${row.title}`,
          messageFr: `Le bon de commande ${issuedPo} a ete emis pour votre demande "${row.title}".`,
          messageEn: `Purchase order ${issuedPo} has been issued for your request "${row.title}".`,
          link: `/op-management/projets/${projectId}/planification/procurement`,
        });
      }
    }
  }

  function openReceiving(row: ProcurementItem) {
    setReceiptMessage("");
    setReceiptId(null);
    setReceivingFor(row);
  }

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receivingFor) return;
    setReceiptSaving(true);
    setReceiptMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      procurement_item_id: receivingFor.id,
      supplier_name: String(form.get("supplier_name") || "").trim() || null,
      receipt_date: String(form.get("receipt_date") || "") || null,
      site: String(form.get("site") || "").trim() || null,
      item_description: String(form.get("item_description") || "").trim() || null,
      quantity_ordered: form.get("quantity_ordered") ? Number(form.get("quantity_ordered")) : null,
      quantity_delivered: form.get("quantity_delivered") ? Number(form.get("quantity_delivered")) : null,
      quantity_accepted: form.get("quantity_accepted") ? Number(form.get("quantity_accepted")) : null,
      quantity_rejected: form.get("quantity_rejected") ? Number(form.get("quantity_rejected")) : null,
      rejection_reason: String(form.get("rejection_reason") || "").trim() || null,
      quality_assessment: String(form.get("quality_assessment") || "") as ReceiptQualityAssessment || null,
      inspection_notes: String(form.get("inspection_notes") || "").trim() || null,
      delivery_note_number: String(form.get("delivery_note_number") || "").trim() || null,
      receipt_minutes_reference: String(form.get("receipt_minutes_reference") || "").trim() || null,
      received_by_name: String(form.get("received_by_name") || "").trim() || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_procurement_receipts").insert({ ...payload, created_by: user?.id }).select("*").single();
    setReceiptSaving(false);
    if (result.error) { setReceiptMessage(result.error.message); return; }
    setReceiptId(result.data.id);
    if (receivingFor.stage === "delivery") await advance(receivingFor, "receipt");
    setReceiptMessage(en ? "Receipt recorded." : "Reception enregistree.");
  }

  async function uploadReceiptEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !receiptId) return;
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/${projectId}/procurement-receipts/${receiptId}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) { setReceiptMessage(upload.error.message); return; }
    await supabase.from("ppm_procurement_receipt_evidence").insert({ receipt_id: receiptId, title: file.name, category: "photo", file_path: path });
    setReceiptMessage(en ? "Evidence added." : "Preuve ajoutee.");
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Procurement</h2><div className="flex gap-2"><Link href={`/op-management/projets/${projectId}/mise-en-oeuvre/receptions`} className="btn-secondary px-4 py-2 text-sm">{en ? "Receipt notes" : "Bons de reception"}</Link><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New purchase" : "Nouvel achat"}</button></div></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">PO</th><th className="p-4">{en ? "Purchase" : "Achat"}</th><th className="p-4">{en ? "Budget line" : "Ligne budgetaire"}</th><th className="p-4">{en ? "Cost centre" : "Centre de cout"}</th><th className="p-4">{en ? "Supplier / Contract" : "Fournisseur / Contrat"}</th><th className="p-4">{en ? "Amount" : "Montant"}</th><th className="p-4">{en ? "Stage / Receipt" : "Etape / Reception"}</th><th className="p-4 text-right">Actions</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-t align-top">
          <td className="p-4 font-mono font-black text-forest">{row.po_reference || "-"}</td>
          <td className="p-4"><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-500">{categoryLabels[row.category][locale]} - {methodLabels[row.procurement_method][locale]}</p></td>
          <td className="p-4">{budgetLines.find(item => item.id === row.budget_line_id)?.description || "-"}</td>
          <td className="p-4">{(() => { const center=costCenters.find(item=>item.id===row.cost_center_id); return center ? `${center.code} - ${center.label}` : "-"; })()}</td>
          <td className="p-4">{row.supplier_name || "-"}<small className="block text-slate-500">{row.contract_reference || "-"}</small></td>
          <td className="p-4 font-bold">{Number(row.awarded_amount ?? row.estimated_value ?? 0).toLocaleString(en ? "en-US" : "fr-FR")} {row.currency}</td>
          <td className="p-4"><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{stageLabels[row.stage][locale]}</span><small className="mt-2 block text-slate-500">{row.receipt_status || "pending_delivery"}</small></td>
          <td className="p-4"><div className="flex flex-wrap justify-end gap-2">{row.po_reference && <Link href={`/op-management/projets/${projectId}/mise-en-oeuvre/receptions?po=${encodeURIComponent(row.po_reference)}`} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Receipts" : "Receptions"}</Link>}{row.stage !== "completed" && row.stage !== "cancelled" && row.stage !== "delivery" && <button onClick={() => advance(row)} className="btn-primary px-3 py-1.5 text-xs">{en ? "Next step" : "Etape suivante"}</button>}<button onClick={() => openEditor(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button>{isFinalStatus("procurement", row.stage) && isSuperAdmin && <button onClick={() => advance(row, "contract")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">{en ? "Reopen" : "Rouvrir"}</button>}</div></td>
        </tr>)}{!rows.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{en ? "No purchase recorded." : "Aucun achat enregistre."}</td></tr>}</tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New purchase" : "Nouvel achat") : (en ? "Edit purchase" : "Modifier l'achat")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Description" : "Description"}<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Work Package" : "Lot de travaux"}<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">-</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Budget line" : "Ligne budgetaire"}<select name="budget_line_id" defaultValue={editing !== "new" ? editing.budget_line_id || "" : ""} className="admin-input"><option value="">-</option>{budgetLines.filter(item=>item.status==="approved").map(item=><option key={item.id} value={item.id}>{item.description} ({en ? "remaining" : "reste"}: {budgetLineRemaining(item).toLocaleString(en ? "en-US" : "fr-FR")} {item.currency})</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Cost centre" : "Centre de cout"}<select name="cost_center_id" defaultValue={editing !== "new" ? editing.cost_center_id || "" : costCenters.find(item=>item.is_default)?.id || ""} className="admin-input"><option value="">-</option>{costCenters.filter(item=>item.status==="active").map(item=><option key={item.id} value={item.id}>{item.code} - {item.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue={editing !== "new" ? editing.category : "goods"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Method" : "Methode"}<select name="procurement_method" defaultValue={editing !== "new" ? editing.procurement_method : "rfq"} className="admin-input">{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Estimated value" : "Valeur estimee"}<input name="estimated_value" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.estimated_value ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Requested by" : "Demande par"}<SearchableSelect name="requested_by_name" options={staffOptions} defaultValue={editing !== "new" ? editing.requested_by_name || "" : ""} placeholder={en ? "Select staff..." : "Selectionner le staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Requester email" : "Email du demandeur"}<input name="requested_by_email" type="email" defaultValue={editing !== "new" ? editing.requested_by_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Supplier" : "Fournisseur"}<select value={supplierId} onChange={event=>setSupplierId(event.target.value)} className="admin-input"><option value="">-</option>{suppliers.filter(item=>item.status==="active").map(item=><option key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ""}{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Contract reference" : "Reference contrat"}<select name="contract_id" defaultValue={editing !== "new" ? editing.contract_id || "" : ""} disabled={!supplierId} className="admin-input"><option value="">-</option>{supplierContracts.map(item=><option key={item.id} value={item.id}>{item.contract_number}{item.title ? ` - ${item.title}` : ""}</option>)}</select></label>
          {editing !== "new" && editing.po_reference && <p className="grid gap-2 text-sm font-bold">{en ? "PO (automatic)" : "PO (automatique)"}<span className="admin-input bg-slate-50 font-mono">{editing.po_reference}</span></p>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Awarded amount" : "Montant attribue"}<input name="awarded_amount" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.awarded_amount ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Expected delivery date" : "Date de livraison prevue"}<input name="delivery_date" type="date" defaultValue={editing !== "new" ? editing.delivery_date || "" : ""} className="admin-input" /></label>
          <fieldset className="rounded-xl border p-3 sm:col-span-2"><legend className="px-1 text-sm font-black">{en ? "Acceptance criteria" : "Criteres d'acceptation"}</legend><div className="grid gap-3">{acceptanceCriteria.map((criterion,index)=><div key={criterion.id} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[90px_1fr_2fr_auto]"><input value={criterion.id} readOnly className="admin-input bg-white font-mono"/><input value={criterion.title} onChange={event=>setAcceptanceCriteria(current=>current.map((item,i)=>i===index?{...item,title:event.target.value}:item))} placeholder={en?"Title":"Titre"} className="admin-input"/><input value={criterion.specification} onChange={event=>setAcceptanceCriteria(current=>current.map((item,i)=>i===index?{...item,specification:event.target.value}:item))} placeholder={en?"Specification":"Specification"} className="admin-input"/><button type="button" onClick={()=>setAcceptanceCriteria(current=>current.filter((_,i)=>i!==index))}><TrashIcon className="h-5 text-red-600"/></button></div>)}</div><button type="button" onClick={addCriterion} className="btn-secondary mt-3 px-3 py-2 text-xs"><PlusIcon className="mr-1 h-4"/>{en?"Add criterion":"Ajouter un critere"}</button></fieldset>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Notes" : "Notes"}<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {receivingFor && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitReceipt} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{en ? "Record receipt" : "Enregistrer la reception"} — {receivingFor.title}</h2><button type="button" onClick={() => setReceivingFor(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">{en ? "Supplier" : "Fournisseur"}<input name="supplier_name" defaultValue={receivingFor.supplier_name || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date<input name="receipt_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Site<input name="site" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Item" : "Article"}<input name="item_description" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Quantity ordered" : "Quantite commandee"}<input name="quantity_ordered" type="number" step="0.01" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Quantity delivered" : "Quantite livree"}<input name="quantity_delivered" type="number" step="0.01" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Quantity accepted" : "Quantite acceptee"}<input name="quantity_accepted" type="number" step="0.01" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Quantity rejected" : "Quantite rejetee"}<input name="quantity_rejected" type="number" step="0.01" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Rejection reason" : "Raison du rejet"}<input name="rejection_reason" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Quality assessment" : "Evaluation qualite"}<select name="quality_assessment" className="admin-input"><option value="">—</option>{Object.entries(qualityAssessmentLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Receiver" : "Receptionnaire"}<SearchableSelect name="received_by_name" options={staffOptions} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Inspection notes" : "Notes d'inspection"}<textarea name="inspection_notes" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Delivery note number" : "Numero bon de livraison"}<input name="delivery_note_number" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Receipt minutes reference" : "Reference PV de reception"}<input name="receipt_minutes_reference" className="admin-input" /></label>
          {receiptId && <div className="sm:col-span-2"><label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{en ? "Add a photo" : "Ajouter une photo"}<input type="file" onChange={uploadReceiptEvidence} className="hidden" /></label></div>}
          {receiptMessage && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{receiptMessage}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setReceivingFor(null)} className="btn-secondary">{en ? "Close" : "Fermer"}</button>{!receiptId && <button disabled={receiptSaving} className="btn-primary">{receiptSaving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Record receipt" : "Enregistrer la reception")}</button>}</div>
        </div>
      </form>
    </div>}
  </div>;
}
