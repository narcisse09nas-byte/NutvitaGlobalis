"use client";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOrganization, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { OpsCooperative, OpsCooperativeContact, OpsSite, OpsSitePaymentAccountType } from "@/lib/ppm/types";

export default function CooperativeManager({ organizationId, initial }: { organizationId: string; initial: OpsCooperative[] }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<OpsCooperative | "new" | null>(null);
  const [managing, setManaging] = useState<OpsCooperative | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [banner, setBanner] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      organization_id: organizationId,
      name: String(form.get("name") || "").trim(),
      address: String(form.get("address") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      default_payment_account_type: String(form.get("default_payment_account_type") || "") as OpsSitePaymentAccountType || null,
      default_payment_account_number: String(form.get("default_payment_account_number") || "").trim() || null,
      default_payment_account_name: String(form.get("default_payment_account_name") || "").trim() || null,
      status: String(form.get("status") || "active") as OpsCooperative["status"],
    };
    if (!payload.name) { setSaving(false); setMessage(en ? "Name is required." : "Le nom est obligatoire."); return; }
    const supabase = createClient();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const orgCode = await getOrgCodeForOrganization(supabase, organizationId);
      result = await withUniqueRegistryCode<OpsCooperative>(
        async code => await supabase.from("ppm_ops_cooperatives").insert({ ...payload, code }).select("*").single(),
        () => generateRegistryCode(orgCode, "cooperative"),
      );
    } else {
      result = await supabase.from("ppm_ops_cooperatives").update(payload).eq("id", (editing as OpsCooperative).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as OpsCooperative;
    setRows(current => isNew ? [...current, saved] : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
    setBanner("");

    // Provision the cooperative's own login account right at creation time (per spec), not just
    // via a later per-contact invite — a temporary password is emailed to it directly.
    if (isNew && saved.email) {
      const accountResult = await fetch("/api/ppm/operations/distribution-partners/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: saved.email, full_name: saved.name, phone: saved.phone, partner_type: "cooperative", cooperative_id: saved.id }),
      }).then(response => response.json());
      setBanner(accountResult.ok
        ? (en ? "Cooperative created. Portal account provisioned, credentials emailed." : "Cooperative creee. Compte portail cree, identifiants envoyes par email.")
        : (en ? `Cooperative created, but the account could not be provisioned: ${accountResult.message || ""}` : `Cooperative creee, mais le compte n'a pas pu etre cree : ${accountResult.message || ""}`));
    }
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Cooperatives / GICs" : "Cooperatives / GICs"}</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New cooperative" : "Nouvelle cooperative"}</button></div>
    {banner && <p className="rounded-2xl bg-mint/30 p-4 text-sm font-bold text-forest">{banner}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Name" : "Nom"}</th><th className="p-4">{en ? "Contact" : "Contact"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b><span className="ml-2 font-mono text-xs text-slate-400">{row.code}</span></td>
            <td className="p-4">{row.phone || row.email || "—"}</td>
            <td className="p-4">{row.status}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button><button onClick={() => setManaging(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Contacts & stamp" : "Contacts & cachet"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={4} className="p-10 text-center text-slate-400">{en ? "No cooperative registered." : "Aucune cooperative enregistree."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? (en ? "New cooperative" : "Nouvelle cooperative") : (en ? "Edit cooperative" : "Modifier la cooperative")}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Name" : "Nom"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Address" : "Adresse"}<input name="address" defaultValue={editing !== "new" ? editing.address || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Phone" : "Telephone"}<input name="phone" defaultValue={editing !== "new" ? editing.phone || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Email{editing === "new" && <span className="block text-xs font-normal text-slate-400">{en ? "A portal login account is created automatically for this address." : "Un compte d'acces au portail est cree automatiquement pour cette adresse."}</span>}<input name="email" type="email" defaultValue={editing !== "new" ? editing.email || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Default account type" : "Type de compte par defaut"}<select name="default_payment_account_type" defaultValue={editing !== "new" ? editing.default_payment_account_type || "" : ""} className="admin-input"><option value="">—</option><option value="mobile_money">Mobile money</option><option value="bank">{en ? "Bank" : "Banque"}</option><option value="other">{en ? "Other" : "Autre"}</option></select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Account holder" : "Titulaire du compte"}<input name="default_payment_account_name" defaultValue={editing !== "new" ? editing.default_payment_account_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Account number" : "Numero de compte"}<input name="default_payment_account_number" defaultValue={editing !== "new" ? editing.default_payment_account_number || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="active">{en ? "Active" : "Active"}</option><option value="suspended">{en ? "Suspended" : "Suspendue"}</option><option value="closed">{en ? "Closed" : "Fermee"}</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}

    {managing && <CooperativeDetailPanel cooperative={managing} onClose={() => setManaging(null)} />}
  </div>;
}

function CooperativeDetailPanel({ cooperative, onClose }: { cooperative: OpsCooperative; onClose: () => void }) {
  const { en } = usePpmLocale();
  const [contacts, setContacts] = useState<OpsCooperativeContact[]>([]);
  const [sites, setSites] = useState<OpsSite[]>([]);
  const [siteChoice, setSiteChoice] = useState<Record<string, string>>({});
  const [stampPath, setStampPath] = useState(cooperative.stamp_image_path || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteMessages, setInviteMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_ops_cooperative_contacts").select("*").eq("cooperative_id", cooperative.id).order("full_name"),
      supabase.from("ppm_ops_sites").select("*").eq("cooperative_id", cooperative.id).order("name"),
    ]).then(([contactsResult, sitesResult]) => {
      setContacts((contactsResult.data || []) as OpsCooperativeContact[]);
      setSites((sitesResult.data || []) as OpsSite[]);
    });
  }, [cooperative.id]);

  async function invitePartner(contact: OpsCooperativeContact) {
    if (!contact.email) return;
    const siteId = siteChoice[contact.id] || sites[0]?.id;
    if (!siteId) return;
    setInviting(contact.id);
    const result = await fetch("/api/ppm/operations/distribution-partners/invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: contact.email, full_name: contact.full_name, phone: contact.phone, partner_type: "cooperative", cooperative_id: cooperative.id, site_id: siteId }),
    }).then(response => response.json());
    setInviting(null);
    setInviteMessages(current => ({ ...current, [contact.id]: result.ok ? (en ? "Invited to the portal." : "Invite(e) au portail.") : (result.message || (en ? "Error" : "Erreur")) }));
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      cooperative_id: cooperative.id,
      full_name: String(form.get("full_name") || "").trim(),
      role: String(form.get("role") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
    };
    if (!payload.full_name) return;
    const result = await createClient().from("ppm_ops_cooperative_contacts").insert(payload).select("*").single();
    if (!result.error) { setContacts(current => [...current, result.data as OpsCooperativeContact]); event.currentTarget.reset(); }
  }

  async function uploadStamp(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/ops/stamps/cooperatives/${cooperative.id}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) { setUploading(false); setMessage(upload.error.message); return; }
    const result = await supabase.from("ppm_ops_cooperatives").update({ stamp_image_path: path }).eq("id", cooperative.id).select("*").single();
    setUploading(false);
    if (result.error) { setMessage(result.error.message); return; }
    setStampPath(path);
  }

  async function viewStamp() {
    if (!stampPath) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(stampPath, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  return <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
    <div className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{cooperative.name}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>

      <section className="mt-5">
        <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Official stamp" : "Cachet officiel"}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : stampPath ? (en ? "Replace" : "Remplacer") : (en ? "Upload" : "Televerser")}<input type="file" accept="image/*" onChange={uploadStamp} className="hidden" /></label>
          {stampPath && <button type="button" onClick={viewStamp} className="text-sm font-bold text-leaf">{en ? "View" : "Voir"}</button>}
        </div>
        {message && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Contacts" : "Contacts"}</h3>
        <div className="mt-2 grid gap-2">
          {contacts.map(item => <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{item.full_name}</b>{item.role ? ` — ${item.role}` : ""}{item.phone ? ` · ${item.phone}` : ""}{item.email ? ` · ${item.email}` : ""}</span>
              {item.email && !!sites.length && <div className="flex items-center gap-2">
                {sites.length > 1 && <select value={siteChoice[item.id] || sites[0].id} onChange={event => setSiteChoice(current => ({ ...current, [item.id]: event.target.value }))} className="admin-input py-1 text-xs">{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select>}
                <button type="button" onClick={() => invitePartner(item)} disabled={inviting === item.id} className="text-xs font-bold text-leaf">{inviting === item.id ? (en ? "Inviting..." : "Invitation...") : (en ? "Invite to portal" : "Inviter au portail")}</button>
              </div>}
              {item.email && !sites.length && <span className="text-xs text-slate-400">{en ? "No linked school yet" : "Aucune ecole liee"}</span>}
            </div>
            {inviteMessages[item.id] && <p className="mt-1 text-xs text-slate-500">{inviteMessages[item.id]}</p>}
          </div>)}
          {!contacts.length && <p className="text-sm text-slate-400">{en ? "No contact registered." : "Aucun contact enregistre."}</p>}
        </div>
        <form onSubmit={addContact} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input name="full_name" placeholder={en ? "Full name" : "Nom complet"} className="admin-input" />
          <input name="role" placeholder={en ? "Role" : "Fonction"} className="admin-input" />
          <input name="phone" placeholder={en ? "Phone" : "Telephone"} className="admin-input" />
          <input name="email" type="email" placeholder="Email" className="admin-input" />
          <button className="btn-secondary justify-self-start px-4 py-2 text-sm sm:col-span-2">{en ? "Add contact" : "Ajouter un contact"}</button>
        </form>
      </section>
    </div>
  </div>;
}
