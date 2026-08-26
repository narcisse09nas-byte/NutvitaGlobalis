"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Row = Record<string, any>;
type Tab = "service" | "proforma" | "pos" | "register";
type InvoiceType = "service" | "proforma" | "pos_meals";

async function request(body?: unknown, query?: string) {
  const response = await fetch(`/api/maximus/invoicing${query ? `?${query}` : ""}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Operation impossible.");
  return data;
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Petit dejeuner" },
  { key: "lunch", label: "Dejeuner" },
  { key: "dinner", label: "Diner" },
] as const;

export default function InvoicingWorkspace() {
  const [tab, setTab] = useState<Tab>("service");
  const tabs: { value: Tab; label: string }[] = [
    { value: "service", label: "Achat de service" },
    { value: "proforma", label: "Facture proforma" },
    { value: "pos", label: "Point de vente partenaire" },
    { value: "register", label: "Registre des factures" },
  ];

  return <div className="space-y-6">
    <header>
      <h2 className="text-3xl font-black text-[#123d32]">Facturation</h2>
      <p className="mt-2 text-slate-500">Achat de services pour un tiers, factures proforma et facturation des points de vente partenaires — centralise dans Maximus.</p>
    </header>
    <nav className="flex flex-wrap gap-2">
      {tabs.map(item => <button key={item.value} onClick={() => setTab(item.value)} className={`rounded-md px-4 py-2 text-sm font-bold ${tab === item.value ? "bg-[#209b68] text-white" : "bg-white text-slate-600 border"}`}>{item.label}</button>)}
    </nav>
    {tab === "service" && <PurchaseForm invoiceType="service" />}
    {tab === "proforma" && <PurchaseForm invoiceType="proforma" />}
    {tab === "pos" && <PosForm />}
    {tab === "register" && <Register />}
  </div>;
}

function PurchaseForm({ invoiceType }: { invoiceType: "service" | "proforma" }) {
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Row[]>([]);
  const [selectedClient, setSelectedClient] = useState<Row | null>(null);
  const [newClient, setNewClient] = useState<Row>({ full_name: "", email: "", phone: "", country: "", city: "", birth_date: "", sex: "" });
  const [purchaseType, setPurchaseType] = useState<"subscription" | "medical_consultation" | "dietetic_consultation" | "other">("subscription");
  const [periodMonths, setPeriodMonths] = useState("3");
  const [assignmentMode, setAssignmentMode] = useState<"direct" | "waiting_room">("waiting_room");
  const [specialists, setSpecialists] = useState<Row[]>([]);
  const [specialistId, setSpecialistId] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [lines, setLines] = useState<Row[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState("XOF");
  const [paymentMethod, setPaymentMethod] = useState("Especes");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Row | null>(null);

  const isConsultation = purchaseType === "medical_consultation" || purchaseType === "dietetic_consultation";

  useEffect(() => {
    if (!clientQuery.trim()) { setClientResults([]); return; }
    const timeout = setTimeout(() => { request(undefined, `resource=clients&query=${encodeURIComponent(clientQuery)}`).then(data => setClientResults(data.items || [])).catch(() => {}); }, 250);
    return () => clearTimeout(timeout);
  }, [clientQuery]);

  useEffect(() => {
    if (!isConsultation) { setSpecialists([]); setSpecialistId(""); return; }
    const kind = purchaseType === "medical_consultation" ? "medical" : "dietetic";
    request(undefined, `resource=specialists&kind=${kind}`).then(data => setSpecialists(data.items || [])).catch(() => {});
  }, [isConsultation, purchaseType]);

  useEffect(() => {
    if (!isConsultation) return;
    setLines([{ description: purchaseType === "medical_consultation" ? "Consultation medicale" : "Consultation dietetique", quantity: 1, unit_price: 0 }]);
  }, [isConsultation, purchaseType]);

  const totals = useMemo(() => {
    const priceExcludingTax = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0);
    const taxAmount = priceExcludingTax * (Number(taxRate || 0) / 100);
    return { priceExcludingTax, taxAmount, totalIncludingTax: priceExcludingTax + taxAmount };
  }, [lines, taxRate]);

  function updateLine(index: number, key: string, value: unknown) {
    setLines(current => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  }
  function addLine() { setLines(current => [...current, { description: "", quantity: 1, unit_price: 0 }]); }
  function removeLine(index: number) { setLines(current => current.length > 1 ? current.filter((_, i) => i !== index) : current); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setResult(null);
    try {
      if (clientMode === "existing" && !selectedClient) throw new Error("Selectionnez un client existant.");
      if (clientMode === "new" && (!newClient.full_name.trim() || !newClient.email.trim())) throw new Error("Nom et email du nouveau client sont requis.");
      const payload: Row = {
        action: "create",
        invoice_type: invoiceType,
        purchase_type: purchaseType,
        existing_client_id: clientMode === "existing" ? selectedClient?.id : null,
        new_client: clientMode === "new" ? newClient : null,
        client_name: clientMode === "existing" ? selectedClient?.full_name : newClient.full_name,
        client_email: clientMode === "existing" ? selectedClient?.email : newClient.email,
        client_phone: clientMode === "existing" ? selectedClient?.phone : newClient.phone,
        period_months: purchaseType === "subscription" ? Number(periodMonths || 3) : null,
        consultation_assignment: isConsultation ? { mode: assignmentMode, specialist_id: assignmentMode === "direct" ? specialistId : null } : null,
        chief_complaint: chiefComplaint,
        lines,
        tax_rate: Number(taxRate || 0),
        currency,
        payment_method: invoiceType === "service" ? paymentMethod : null,
        notes,
        submit_immediately: invoiceType === "service",
      };
      const data = await request(payload);
      setResult(data.item);
      setSelectedClient(null); setClientQuery(""); setClientResults([]);
      setNewClient({ full_name: "", email: "", phone: "", country: "", city: "", birth_date: "", sex: "" });
      setLines([{ description: "", quantity: 1, unit_price: 0 }]);
      setNotes("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-md border bg-white p-6">
    {error && <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
    {result && <p className="rounded-xl bg-mint/40 p-4 font-bold text-forest">
      {invoiceType === "service" ? "Achat enregistre et soumis" : "Proforma generee"} — {result.invoice_number}.
      {" "}<a href={`/api/maximus/invoicing/pdf?id=${result.id}`} target="_blank" rel="noopener noreferrer" className="underline">Voir la facture</a>
    </p>}

    <section>
      <h3 className="font-black uppercase text-xs text-slate-400">Client</h3>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => setClientMode("existing")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${clientMode === "existing" ? "bg-[#209b68] text-white" : "border"}`}>Client existant</button>
        <button type="button" onClick={() => setClientMode("new")} className={`rounded-md px-3 py-1.5 text-xs font-bold ${clientMode === "new" ? "bg-[#209b68] text-white" : "border"}`}>Nouveau client</button>
      </div>
      {clientMode === "existing" ? <div className="mt-3">
        <input value={clientQuery} onChange={event => { setClientQuery(event.target.value); setSelectedClient(null); }} placeholder="Rechercher par nom ou email..." className="admin-input" />
        {!!clientResults.length && !selectedClient && <div className="mt-2 grid gap-1 rounded-md border p-2">
          {clientResults.map(row => <button type="button" key={row.id} onClick={() => { setSelectedClient(row); setClientQuery(row.full_name); setClientResults([]); }} className="rounded px-2 py-1 text-left text-sm hover:bg-slate-50"><b>{row.full_name}</b> — {row.email}</button>)}
        </div>}
        {selectedClient && <p className="mt-2 text-sm text-slate-500">Selectionne : <b>{selectedClient.full_name}</b> ({selectedClient.email})</p>}
      </div> : <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Nom complet" value={newClient.full_name} onChange={value => setNewClient({ ...newClient, full_name: value })} required />
        <Field label="Email" type="email" value={newClient.email} onChange={value => setNewClient({ ...newClient, email: value })} required />
        <Field label="Telephone" value={newClient.phone} onChange={value => setNewClient({ ...newClient, phone: value })} />
        <Field label="Date de naissance" type="date" value={newClient.birth_date} onChange={value => setNewClient({ ...newClient, birth_date: value })} />
        <Field label="Pays" value={newClient.country} onChange={value => setNewClient({ ...newClient, country: value })} />
        <Field label="Ville" value={newClient.city} onChange={value => setNewClient({ ...newClient, city: value })} />
        <p className="text-xs text-slate-400 md:col-span-2">Un compte d&apos;acces avec mot de passe temporaire sera cree et envoye par email a ce client.</p>
      </div>}
    </section>

    <section>
      <h3 className="font-black uppercase text-xs text-slate-400">Objet de l&apos;achat</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">Type d&apos;achat<select value={purchaseType} onChange={event => setPurchaseType(event.target.value as typeof purchaseType)} className="admin-input">
          <option value="subscription">Abonnement / renouvellement de service</option>
          <option value="medical_consultation">Consultation medicale</option>
          <option value="dietetic_consultation">Consultation dietetique</option>
          <option value="other">Autre service</option>
        </select></label>
        {purchaseType === "subscription" && <Field label="Duree (mois)" type="number" value={periodMonths} onChange={setPeriodMonths} />}
      </div>
      {isConsultation && <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">Affectation<select value={assignmentMode} onChange={event => setAssignmentMode(event.target.value as typeof assignmentMode)} className="admin-input">
          <option value="waiting_room">Envoyer en salle d&apos;attente</option>
          <option value="direct">Attribuer directement</option>
        </select></label>
        {assignmentMode === "direct" && <label className="grid gap-2 text-sm font-bold">{purchaseType === "medical_consultation" ? "Medecin" : "Nutritionniste"}<select value={specialistId} onChange={event => setSpecialistId(event.target.value)} required className="admin-input">
          <option value="">Selectionner...</option>
          {specialists.map(row => <option key={row.id} value={row.id}>{row.full_name}{row.specialty ? ` — ${row.specialty}` : ""}</option>)}
        </select></label>}
        <label className="grid gap-2 text-sm font-bold md:col-span-2">Motif<textarea value={chiefComplaint} onChange={event => setChiefComplaint(event.target.value)} rows={2} className="admin-input" /></label>
      </div>}
    </section>

    <section>
      <h3 className="font-black uppercase text-xs text-slate-400">Lignes de facturation</h3>
      <div className="mt-2 grid gap-2">
        {lines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_100px_140px_auto] gap-2">
          <input value={line.description} onChange={event => updateLine(index, "description", event.target.value)} placeholder="Description" required className="admin-input" />
          <input type="number" min="0" step="1" value={line.quantity} onChange={event => updateLine(index, "quantity", Number(event.target.value))} className="admin-input" />
          <input type="number" min="0" step="0.01" value={line.unit_price} onChange={event => updateLine(index, "unit_price", Number(event.target.value))} className="admin-input" />
          <button type="button" onClick={() => removeLine(index)} className="text-red-600">Retirer</button>
        </div>)}
        <button type="button" onClick={addLine} className="justify-self-start text-sm font-bold text-[#168353]">+ Ajouter une ligne</button>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-3">
      <Field label="Devise" value={currency} onChange={setCurrency} />
      <Field label="Taux de taxe (%)" type="number" value={taxRate} onChange={setTaxRate} />
      {invoiceType === "service" && <label className="grid gap-2 text-sm font-bold">Moyen de paiement<select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="admin-input">
        <option>Especes</option><option>Virement bancaire</option><option>Mobile Money</option><option>Cheque</option><option>Carte bancaire</option>
      </select></label>}
    </section>

    <label className="grid gap-2 text-sm font-bold">Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} className="admin-input" /></label>

    <div className="rounded-md bg-slate-50 p-4 text-sm">
      <p>HT : {totals.priceExcludingTax.toLocaleString("fr-FR")} {currency}</p>
      <p>Taxe : {totals.taxAmount.toLocaleString("fr-FR")} {currency}</p>
      <p className="font-black text-[#123d32]">TOTAL TTC : {totals.totalIncludingTax.toLocaleString("fr-FR")} {currency}</p>
    </div>

    <button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : invoiceType === "service" ? "Enregistrer et soumettre l'achat" : "Generer la proforma"}</button>
  </form>;
}

function PosForm() {
  const [partners, setPartners] = useState<Row[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [newPartner, setNewPartner] = useState<Row>({ full_name: "", email: "", phone: "", country: "", city: "" });
  const [counts, setCounts] = useState<Record<string, string>>({ breakfast: "0", lunch: "0", dinner: "0" });
  const [prices, setPrices] = useState<Record<string, string>>({ breakfast: "0", lunch: "0", dinner: "0" });
  const [currency, setCurrency] = useState("XOF");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Row | null>(null);

  useEffect(() => { request(undefined, "resource=pos-partners").then(data => setPartners(data.items || [])).catch(() => {}); }, []);

  const lines = useMemo(() => MEAL_TYPES
    .filter(meal => Number(counts[meal.key] || 0) !== 0)
    .map(meal => ({ description: meal.label, quantity: Number(counts[meal.key] || 0), unit_price: Number(prices[meal.key] || 0) })), [counts, prices]);
  const totalIncludingTax = useMemo(() => {
    const ht = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
    return ht + ht * (Number(taxRate || 0) / 100);
  }, [lines, taxRate]);

  async function createPartner() {
    setError("");
    try {
      if (!newPartner.full_name.trim()) throw new Error("Nom du point de vente requis.");
      const data = await request({ action: "create-pos-partner", ...newPartner });
      setPartners(current => [...current, data.item]);
      setPartnerId(data.item.id);
      setCreatingPartner(false);
      setNewPartner({ full_name: "", email: "", phone: "", country: "", city: "" });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Creation impossible.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setResult(null);
    try {
      if (!partnerId) throw new Error("Selectionnez un point de vente.");
      if (!lines.length) throw new Error("Au moins un type de repas doit avoir une quantite non nulle.");
      const data = await request({ action: "create", invoice_type: "pos_meals", purchase_type: "meals", partner_vendor_id: partnerId, lines, tax_rate: Number(taxRate || 0), currency, notes });
      setResult(data.item);
      setCounts({ breakfast: "0", lunch: "0", dinner: "0" });
      setNotes("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-md border bg-white p-6">
    {error && <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
    {result && <p className="rounded-xl bg-mint/40 p-4 font-bold text-forest">Facture generee — {result.invoice_number}.
      {" "}<a href={`/api/maximus/invoicing/pdf?id=${result.id}`} target="_blank" rel="noopener noreferrer" className="underline">Voir la facture</a>
    </p>}

    <section>
      <h3 className="font-black uppercase text-xs text-slate-400">Point de vente partenaire</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select value={partnerId} onChange={event => setPartnerId(event.target.value)} className="admin-input">
          <option value="">Selectionner...</option>
          {partners.map(row => <option key={row.id} value={row.id}>{row.vendor_number} — {row.full_name}</option>)}
        </select>
        <button type="button" onClick={() => setCreatingPartner(current => !current)} className="text-sm font-bold text-[#168353]">+ Nouveau point de vente</button>
      </div>
      {creatingPartner && <div className="mt-3 grid gap-3 rounded-md bg-slate-50 p-4 md:grid-cols-2">
        <Field label="Nom" value={newPartner.full_name} onChange={value => setNewPartner({ ...newPartner, full_name: value })} required />
        <Field label="Email" type="email" value={newPartner.email} onChange={value => setNewPartner({ ...newPartner, email: value })} />
        <Field label="Telephone" value={newPartner.phone} onChange={value => setNewPartner({ ...newPartner, phone: value })} />
        <Field label="Ville" value={newPartner.city} onChange={value => setNewPartner({ ...newPartner, city: value })} />
        <button type="button" onClick={createPartner} className="btn-secondary justify-self-start md:col-span-2">Creer le point de vente</button>
      </div>}
    </section>

    <section>
      <h3 className="font-black uppercase text-xs text-slate-400">Repas servis</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-3">
        {MEAL_TYPES.map(meal => <div key={meal.key} className="rounded-md border p-3">
          <p className="text-sm font-bold">{meal.label}</p>
          <label className="mt-2 grid gap-1 text-xs font-bold text-slate-500">Nombre<input type="number" min="0" value={counts[meal.key]} onChange={event => setCounts({ ...counts, [meal.key]: event.target.value })} className="admin-input" /></label>
          <label className="mt-2 grid gap-1 text-xs font-bold text-slate-500">Prix unitaire<input type="number" min="0" step="0.01" value={prices[meal.key]} onChange={event => setPrices({ ...prices, [meal.key]: event.target.value })} className="admin-input" /></label>
        </div>)}
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      <Field label="Devise" value={currency} onChange={setCurrency} />
      <Field label="Taux de taxe (%)" type="number" value={taxRate} onChange={setTaxRate} />
    </section>
    <label className="grid gap-2 text-sm font-bold">Notes<textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} className="admin-input" /></label>

    <div className="rounded-md bg-slate-50 p-4 text-sm">
      {lines.map(line => <p key={line.description}>{line.description} : {line.quantity} × {line.unit_price.toLocaleString("fr-FR")} {currency} = {(line.quantity * line.unit_price).toLocaleString("fr-FR")} {currency}</p>)}
      <p className="mt-1 font-black text-[#123d32]">TOTAL TTC : {totalIncludingTax.toLocaleString("fr-FR")} {currency}</p>
    </div>

    <button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Generer la facture"}</button>
  </form>;
}

function Register() {
  const [type, setType] = useState<InvoiceType>("service");
  const [items, setItems] = useState<Row[]>([]);
  const [canEndorse, setCanEndorse] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endorsing, setEndorsing] = useState<Row | null>(null);
  const [accounts, setAccounts] = useState<Row[]>([]);
  const [accountId, setAccountId] = useState("");
  const [reference, setReference] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await request(undefined, `resource=invoices&type=${type}`);
      setItems(data.items || []);
      setCanEndorse(!!data.canEndorse);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [type]);
  useEffect(() => { if (endorsing) request(undefined, "resource=financial-accounts").then(data => setAccounts(data.items || [])).catch(() => {}); }, [endorsing]);

  async function submitAction(invoice: Row, action: "submit" | "reject") {
    try {
      await request({ action, invoice_id: invoice.id, reason: action === "reject" ? window.prompt("Motif du rejet ?") || "" : undefined });
      load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Operation impossible.");
    }
  }

  async function submitEndorse() {
    if (!endorsing || !accountId) return;
    try {
      await request({ action: "endorse", invoice_id: endorsing.id, account_id: accountId, reference });
      setEndorsing(null); setAccountId(""); setReference("");
      load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Endossement impossible.");
    }
  }

  const statusLabel: Record<string, string> = { draft: "Brouillon", submitted: "Soumise", endorsed: "Endossee (payee)", rejected: "Rejetee", cancelled: "Annulee", issued: "Emise" };

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {(["service", "proforma", "pos_meals"] as InvoiceType[]).map(value => <button key={value} onClick={() => setType(value)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${type === value ? "bg-[#209b68] text-white" : "border"}`}>{value === "service" ? "Services" : value === "proforma" ? "Proforma" : "Points de vente"}</button>)}
    </div>
    {error && <p className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-md border bg-white">
      {loading ? <p className="p-12 text-center text-slate-500">Chargement...</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead><tr className="bg-slate-50"><th className="p-4">N°</th><th className="p-4">Date</th><th className="p-4">Destinataire</th><th className="p-4">TTC</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
          <tbody className="divide-y">
            {items.map(row => <tr key={row.id}>
              <td className="p-4 font-mono text-xs font-bold">{row.invoice_number}</td>
              <td className="p-4">{new Date(row.created_at).toLocaleDateString("fr-FR")}</td>
              <td className="p-4">{row.client_name || "—"}</td>
              <td className="p-4 font-bold">{Number(row.total_including_tax).toLocaleString("fr-FR")} {row.currency}</td>
              <td className="p-4">{statusLabel[row.status] || row.status}</td>
              <td className="p-4"><div className="flex flex-wrap gap-2">
                <a href={`/api/maximus/invoicing/pdf?id=${row.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#168353]">Voir</a>
                {row.status === "draft" && <button onClick={() => submitAction(row, "submit")} className="font-bold text-[#168353]">Soumettre</button>}
                {row.status === "submitted" && canEndorse && <button onClick={() => setEndorsing(row)} className="font-bold text-[#168353]">Endosser</button>}
                {row.status === "submitted" && canEndorse && <button onClick={() => submitAction(row, "reject")} className="font-bold text-red-600">Rejeter</button>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      {!loading && !items.length && <p className="p-10 text-center text-slate-500">Aucune facture pour le moment.</p>}
    </div>

    {endorsing && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#123d32]/80 p-4">
      <div className="w-full max-w-lg rounded-[28px] bg-[#123d32] p-5"><div className="rounded-2xl bg-white p-6">
        <h3 className="text-xl font-black">Endosser {endorsing.invoice_number}</h3>
        <p className="mt-1 text-sm text-slate-500">Confirmez que le paiement a bien ete depose avant d&apos;endosser.</p>
        <label className="mt-4 grid gap-2 text-sm font-bold">Compte de reception<select value={accountId} onChange={event => setAccountId(event.target.value)} className="admin-input">
          <option value="">Selectionner...</option>
          {accounts.map(row => <option key={row.id} value={row.id}>{row.name} ({row.channel})</option>)}
        </select></label>
        <label className="mt-3 grid gap-2 text-sm font-bold">Reference<input value={reference} onChange={event => setReference(event.target.value)} className="admin-input" /></label>
        <div className="mt-5 flex justify-end gap-3"><button onClick={() => setEndorsing(null)} className="btn-secondary">Annuler</button><button onClick={submitEndorse} className="btn-primary">Endosser</button></div>
      </div></div>
    </div>}
  </div>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<input required={required} type={type} className="admin-input" value={value ?? ""} onChange={event => onChange(event.target.value)} /></label>;
}
