"use client";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { getOrgCodeForProject, withUniqueRegistryCode, generateSequenceCode } from "@/lib/ppm/ids";
import { checkIsSuperAdmin, isFinalStatus } from "@/lib/ppm/lock";
import { notifyPpmEventClient } from "@/lib/ppm/notify-client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type {
  PPMResource, ProcurementCategory, ProcurementItem, ProcurementMethod, ProcurementStage,
  ReceiptQualityAssessment, WBSNode,
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

export default function ProcurementPipeline({ projectId, initial, wbsNodes, staff = [] }: { projectId: string; initial: ProcurementItem[]; wbsNodes: WBSNode[]; staff?: PPMResource[] }) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<ProcurementItem | "new" | null>(null);
  const [receivingFor, setReceivingFor] = useState<ProcurementItem | null>(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [receiptMessage, setReceiptMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => { checkIsSuperAdmin(createClient()).then(setIsSuperAdmin); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      work_package_id: String(form.get("work_package_id") || "") || null,
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      category: String(form.get("category") || "goods") as ProcurementCategory,
      procurement_method: String(form.get("procurement_method") || "rfq") as ProcurementMethod,
      estimated_value: form.get("estimated_value") ? Number(form.get("estimated_value")) : null,
      currency: String(form.get("currency") || "XAF"),
      requested_by_name: String(form.get("requested_by_name") || "").trim() || null,
      requested_by_email: String(form.get("requested_by_email") || "").trim() || null,
      supplier_name: String(form.get("supplier_name") || "").trim() || null,
      contract_reference: String(form.get("contract_reference") || "").trim() || null,
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
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Procurement</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New purchase" : "Nouvel achat"}</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{categoryLabels[row.category][locale]} · {methodLabels[row.procurement_method][locale]}{row.supplier_name ? ` · ${row.supplier_name}` : ""}</p></div>
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{stageLabels[row.stage][locale]}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {row.estimated_value && <span>{en ? "Estimated" : "Estime"} : {row.estimated_value.toLocaleString(en ? "en-US" : "fr-FR")} {row.currency}</span>}
          {row.awarded_amount && <span>{en ? "Awarded" : "Attribue"} : {row.awarded_amount.toLocaleString(en ? "en-US" : "fr-FR")} {row.currency}</span>}
          {row.po_reference && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-500">PO {row.po_reference}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {row.stage === "delivery" && <button onClick={() => openReceiving(row)} className="btn-primary px-3 py-1.5 text-xs">{en ? "Record receipt" : "Enregistrer la reception"}</button>}
          {row.stage !== "completed" && row.stage !== "cancelled" && row.stage !== "delivery" && <button onClick={() => advance(row)} className="btn-primary px-3 py-1.5 text-xs">{en ? "Next step" : "Etape suivante"} →</button>}
          <button onClick={() => setEditing(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Edit" : "Modifier"}</button>
          {isFinalStatus("procurement", row.stage) && isSuperAdmin && <button onClick={() => advance(row, "contract")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">{en ? "Reopen (admin)" : "Rouvrir (admin)"}</button>}
        </div>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No purchase recorded." : "Aucun achat enregistre."}</p>}
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New purchase" : "Nouvel achat") : (en ? "Edit purchase" : "Modifier l'achat")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editing !== "new" ? editing.title : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editing !== "new" ? editing.description || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Work Package<select name="work_package_id" defaultValue={editing !== "new" ? editing.work_package_id || "" : ""} className="admin-input"><option value="">{en ? "None" : "Aucun"}</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue={editing !== "new" ? editing.category : "goods"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Method" : "Methode"}<select name="procurement_method" defaultValue={editing !== "new" ? editing.procurement_method : "rfq"} className="admin-input">{Object.entries(methodLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Estimated value" : "Valeur estimee"}<input name="estimated_value" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.estimated_value ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Currency" : "Devise"}<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Requested by" : "Demande par"}<SearchableSelect name="requested_by_name" options={staffOptions} defaultValue={editing !== "new" ? editing.requested_by_name || "" : ""} allowOther otherLabel={en ? "Requester name" : "Nom du demandeur"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Requester email" : "Email du demandeur"}<input name="requested_by_email" type="email" defaultValue={editing !== "new" ? editing.requested_by_email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Supplier" : "Fournisseur"}<input name="supplier_name" defaultValue={editing !== "new" ? editing.supplier_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Contract reference" : "Reference contrat"}<input name="contract_reference" defaultValue={editing !== "new" ? editing.contract_reference || "" : ""} className="admin-input" /></label>
          {editing !== "new" && editing.po_reference && <p className="grid gap-2 text-sm font-bold">{en ? "PO (auto-generated)" : "PO (genere automatiquement)"}<span className="admin-input bg-slate-50 font-mono">{editing.po_reference}</span></p>}
          <label className="grid gap-2 text-sm font-bold">{en ? "Awarded amount" : "Montant attribue"}<input name="awarded_amount" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.awarded_amount ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Delivery date" : "Date de livraison"}<input name="delivery_date" type="date" defaultValue={editing !== "new" ? editing.delivery_date || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
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
