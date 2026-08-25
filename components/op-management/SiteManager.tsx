"use client";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Country, State } from "country-state-city";
import { MapPinIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import PPMFormModal from "@/components/op-management/PPMFormModal";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForOperation, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type {
  OpsCooperative, OpsSite, OpsSitePaymentAccount, OpsSitePaymentAccountType, OpsSiteTeamMember,
  OpsSiteTeamRole, OpsSiteType,
} from "@/lib/ppm/types";

const countries = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name));

const siteTypeLabels: Record<OpsSiteType, { fr: string; en: string }> = {
  school: { fr: "Ecole", en: "School" }, health_center: { fr: "Centre de sante", en: "Health center" },
  community: { fr: "Communaute", en: "Community" }, other: { fr: "Autre", en: "Other" },
};
const accountTypeLabels: Record<OpsSitePaymentAccountType, { fr: string; en: string }> = {
  mobile_money: { fr: "Mobile money", en: "Mobile money" }, bank: { fr: "Banque", en: "Bank" }, other: { fr: "Autre", en: "Other" },
};
const teamRoleLabels: Record<OpsSiteTeamRole, { fr: string; en: string }> = {
  coges_president: { fr: "President COGES", en: "COGES president" }, coges_member: { fr: "Membre COGES", en: "COGES member" },
  distribution_officer: { fr: "Responsable distribution", en: "Distribution officer" }, delivery_team: { fr: "Equipe de livraison", en: "Delivery team" },
  other: { fr: "Autre", en: "Other" },
};

export default function SiteManager({ operationId, isSfHgsf, initial, cooperatives = [] }: {
  operationId: string; isSfHgsf: boolean; initial: OpsSite[]; cooperatives?: OpsCooperative[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<OpsSite | "new" | null>(null);
  const [managing, setManaging] = useState<OpsSite | null>(null);
  const [countryIso, setCountryIso] = useState("");
  const [countryName, setCountryName] = useState("");
  const [regionName, setRegionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const cooperativeName = (id?: string | null) => cooperatives.find(item => item.id === id)?.name || "—";

  const states = useMemo(() => countryIso ? State.getStatesOfCountry(countryIso).sort((a, b) => a.name.localeCompare(b.name)) : [], [countryIso]);

  function openEditor(row: OpsSite | "new") {
    setMessage("");
    setCountryName(row !== "new" ? row.country : "");
    setRegionName(row !== "new" ? row.region || "" : "");
    setCountryIso(row !== "new" ? countries.find(item => item.name === row.country)?.isoCode || "" : "");
    setEditing(row);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      operation_id: operationId,
      site_type: String(form.get("site_type") || "school") as OpsSiteType,
      name: String(form.get("name") || "").trim(),
      short_initials: String(form.get("short_initials") || "").trim().toUpperCase().slice(0, 3),
      country: String(form.get("country") || "").trim(),
      region: String(form.get("region") || "").trim() || null,
      division: String(form.get("division") || "").trim() || null,
      subdivision: String(form.get("subdivision") || "").trim() || null,
      cooperative_id: isSfHgsf ? (String(form.get("cooperative_id") || "") || null) : null,
      status: String(form.get("status") || "active") as OpsSite["status"],
    };
    if (!payload.name || !payload.country) { setSaving(false); setMessage(en ? "Name and country are required." : "Le nom et le pays sont obligatoires."); return; }
    if (!payload.short_initials) { setSaving(false); setMessage(en ? "The short initials (up to 3 letters) are required." : "Les initiales courtes (3 lettres max) sont obligatoires."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    let result;
    if (isNew) {
      const orgCode = await getOrgCodeForOperation(supabase, operationId);
      result = await withUniqueRegistryCode<OpsSite>(
        async code => await supabase.from("ppm_ops_sites").insert({ ...payload, code, created_by: user?.id }).select("*").single(),
        () => generateRegistryCode(orgCode, "distribution_site"),
      );
    } else {
      result = await supabase.from("ppm_ops_sites").update(payload).eq("id", (editing as OpsSite).id).select("*").single();
    }
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const saved = result.data as OpsSite;
    if (isNew) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from("ppm_history").insert({ entity_type: "distribution_site", entity_id: saved.id, actor_id: currentUser?.id, action: "Site cree", to_status: saved.status, note: saved.name });
    }
    setRows(current => isNew ? [...current, saved] : current.map(row => row.id === saved.id ? saved : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Distribution sites" : "Sites de distribution"}</h2><button onClick={() => openEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New site" : "Nouveau site"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{en ? "Site" : "Site"}</th><th className="p-4">{en ? "Type" : "Type"}</th><th className="p-4">{en ? "Location" : "Localisation"}</th>{isSfHgsf && <th className="p-4">{en ? "Cooperative" : "Cooperative"}</th>}<th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b><span className="ml-2 font-mono text-xs text-slate-400">{row.code} · {row.short_initials}</span></td>
            <td className="p-4">{siteTypeLabels[row.site_type][locale]}</td>
            <td className="p-4">{[row.subdivision, row.division, row.region, row.country].filter(Boolean).join(", ")}</td>
            {isSfHgsf && <td className="p-4">{cooperativeName(row.cooperative_id)}</td>}
            <td className="p-4">{row.status}</td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => openEditor(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Edit" : "Modifier"}</button><button onClick={() => setManaging(row)} className="btn-secondary px-3 py-2 text-xs">{en ? "Team & payment" : "Equipe & paiement"}</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={isSfHgsf ? 6 : 5} className="p-10 text-center text-slate-400">{en ? "No site registered." : "Aucun site enregistre."}</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <PPMFormModal icon={MapPinIcon} title={editing === "new" ? (en ? "New site" : "Nouveau site") : (en ? "Edit site" : "Modifier le site")} onClose={() => setEditing(null)}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Site name" : "Nom du site"}<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Type" : "Type"}<select name="site_type" defaultValue={editing !== "new" ? editing.site_type : "school"} className="admin-input">{Object.entries(siteTypeLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Short initials (max 3 letters, for PO/invoice numbering)" : "Initiales courtes (3 lettres max, pour la numerotation des bons/factures)"}<input name="short_initials" maxLength={3} defaultValue={editing !== "new" ? editing.short_initials : ""} required className="admin-input uppercase" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Country" : "Pays"}<select required className="admin-input" value={countryIso} onChange={event => { const iso = event.target.value; setCountryIso(iso); setCountryName(countries.find(item => item.isoCode === iso)?.name || ""); setRegionName(""); }}>
          <option value="">{en ? "Select..." : "Selectionner..."}</option>
          {countries.map(item => <option key={item.isoCode} value={item.isoCode}>{item.name}</option>)}
        </select></label>
        <input type="hidden" name="country" value={countryName} />
        <label className="grid gap-2 text-sm font-bold">{en ? "Region / State" : "Region / Etat"}<select name="region" className="admin-input" value={regionName} disabled={!states.length} onChange={event => setRegionName(event.target.value)}>
          <option value="">{states.length ? (en ? "Select..." : "Selectionner...") : (en ? "No subdivision listed" : "Aucune subdivision listee")}</option>
          {states.map(item => <option key={item.isoCode} value={item.name}>{item.name}</option>)}
        </select></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Division" : "Division"}<input name="division" defaultValue={editing !== "new" ? editing.division || "" : ""} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">{en ? "Subdivision" : "Sous-division"}<input name="subdivision" defaultValue={editing !== "new" ? editing.subdivision || "" : ""} className="admin-input" /></label>
        {isSfHgsf && <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Current supplier cooperative" : "Cooperative fournisseur actuelle"}<select name="cooperative_id" defaultValue={editing !== "new" ? editing.cooperative_id || "" : ""} className="admin-input"><option value="">{en ? "None yet" : "Aucune pour le moment"}</option>{cooperatives.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
        <label className="grid gap-2 text-sm font-bold">{en ? "Status" : "Statut"}<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="active">{en ? "Active" : "Actif"}</option><option value="suspended">{en ? "Suspended" : "Suspendu"}</option><option value="closed">{en ? "Closed" : "Ferme"}</option></select></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
      </form>
    </PPMFormModal>}

    {managing && <SiteDetailPanel site={managing} onClose={() => setManaging(null)} />}
  </div>;
}

function SiteDetailPanel({ site, onClose }: { site: OpsSite; onClose: () => void }) {
  const { en } = usePpmLocale();
  const [accounts, setAccounts] = useState<OpsSitePaymentAccount[]>([]);
  const [team, setTeam] = useState<OpsSiteTeamMember[]>([]);
  const [stampPath, setStampPath] = useState(site.stamp_image_path || "");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteMessages, setInviteMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_ops_site_payment_accounts").select("*").eq("site_id", site.id).order("is_default", { ascending: false }),
      supabase.from("ppm_ops_site_team_members").select("*").eq("site_id", site.id).order("full_name"),
    ]).then(([accountsResult, teamResult]) => {
      setAccounts((accountsResult.data || []) as OpsSitePaymentAccount[]);
      setTeam((teamResult.data || []) as OpsSiteTeamMember[]);
    });
  }, [site.id]);

  async function addAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      site_id: site.id,
      account_type: String(form.get("account_type") || "mobile_money") as OpsSitePaymentAccountType,
      account_name: String(form.get("account_name") || "").trim(),
      account_number: String(form.get("account_number") || "").trim(),
      provider: String(form.get("provider") || "").trim() || null,
      is_default: accounts.length === 0,
    };
    if (!payload.account_name || !payload.account_number) return;
    const result = await createClient().from("ppm_ops_site_payment_accounts").insert(payload).select("*").single();
    if (!result.error) { setAccounts(current => [...current, result.data as OpsSitePaymentAccount]); event.currentTarget.reset(); }
  }

  async function addTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      site_id: site.id,
      full_name: String(form.get("full_name") || "").trim(),
      role: String(form.get("role") || "coges_member") as OpsSiteTeamRole,
      phone: String(form.get("phone") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
    };
    if (!payload.full_name) return;
    const result = await createClient().from("ppm_ops_site_team_members").insert(payload).select("*").single();
    if (!result.error) { setTeam(current => [...current, result.data as OpsSiteTeamMember]); event.currentTarget.reset(); }
  }

  async function uploadStamp(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `ppm/ops/stamps/${site.id}/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const upload = await supabase.storage.from("document-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (upload.error) { setUploading(false); setMessage(upload.error.message); return; }
    const result = await supabase.from("ppm_ops_sites").update({ stamp_image_path: path }).eq("id", site.id).select("*").single();
    setUploading(false);
    if (result.error) { setMessage(result.error.message); return; }
    setStampPath(path);
  }

  async function viewStamp() {
    if (!stampPath) return;
    const { data, error } = await createClient().storage.from("document-vault").createSignedUrl(stampPath, 180);
    if (!error) window.open(data.signedUrl, "_blank");
  }

  async function invitePartner(member: OpsSiteTeamMember) {
    if (!member.email) return;
    setInviting(member.id);
    const result = await fetch("/api/ppm/operations/distribution-partners/invite", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: member.email, full_name: member.full_name, phone: member.phone, partner_type: "coges", site_id: site.id, coges_role: member.role }),
    }).then(response => response.json());
    setInviting(null);
    setInviteMessages(current => ({ ...current, [member.id]: result.ok ? (en ? "Invited to the portal." : "Invite(e) au portail.") : (result.message || (en ? "Error" : "Erreur")) }));
  }

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
    <div className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{site.name}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>

      <section className="mt-6">
        <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Official stamp" : "Cachet officiel"}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="btn-secondary w-fit cursor-pointer px-4 py-2 text-sm">{uploading ? (en ? "Uploading..." : "Televersement...") : stampPath ? (en ? "Replace" : "Remplacer") : (en ? "Upload" : "Televerser")}<input type="file" accept="image/*" onChange={uploadStamp} className="hidden" /></label>
          {stampPath && <button type="button" onClick={viewStamp} className="text-sm font-bold text-leaf">{en ? "View" : "Voir"}</button>}
        </div>
        {message && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Payment account(s)" : "Compte(s) de paiement"}</h3>
        <div className="mt-2 grid gap-2">
          {accounts.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm"><span>{item.account_type === "mobile_money" ? (en ? "Mobile money" : "Mobile money") : item.account_type === "bank" ? (en ? "Bank" : "Banque") : (en ? "Other" : "Autre")} — {item.account_name} ({item.account_number}){item.provider ? ` · ${item.provider}` : ""}</span>{item.is_default && <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold text-forest">{en ? "Default" : "Par defaut"}</span>}</div>)}
          {!accounts.length && <p className="text-sm text-slate-400">{en ? "No payment account registered." : "Aucun compte de paiement enregistre."}</p>}
        </div>
        <form onSubmit={addAccount} className="mt-3 grid gap-2 sm:grid-cols-2">
          <select name="account_type" defaultValue="mobile_money" className="admin-input"><option value="mobile_money">{en ? "Mobile money" : "Mobile money"}</option><option value="bank">{en ? "Bank" : "Banque"}</option><option value="other">{en ? "Other" : "Autre"}</option></select>
          <input name="provider" placeholder={en ? "Provider (e.g. Orange Money)" : "Fournisseur (ex : Orange Money)"} className="admin-input" />
          <input name="account_name" placeholder={en ? "Account holder name" : "Nom du titulaire"} className="admin-input" />
          <input name="account_number" placeholder={en ? "Account number" : "Numero de compte"} className="admin-input" />
          <button className="btn-secondary justify-self-start px-4 py-2 text-sm sm:col-span-2">{en ? "Add account" : "Ajouter un compte"}</button>
        </form>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-black uppercase text-slate-400">{en ? "Team (COGES / distribution team)" : "Equipe (COGES / equipe de distribution)"}</h3>
        <div className="mt-2 grid gap-2">
          {team.map(item => <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><b>{item.full_name}</b> — {teamRoleLabels[item.role][en ? "en" : "fr"]}{item.phone ? ` · ${item.phone}` : ""}{item.email ? ` · ${item.email}` : ""}</span>
              {item.email && <button type="button" onClick={() => invitePartner(item)} disabled={inviting === item.id} className="text-xs font-bold text-leaf">{inviting === item.id ? (en ? "Inviting..." : "Invitation...") : (en ? "Invite to portal" : "Inviter au portail")}</button>}
            </div>
            {inviteMessages[item.id] && <p className="mt-1 text-xs text-slate-500">{inviteMessages[item.id]}</p>}
          </div>)}
          {!team.length && <p className="text-sm text-slate-400">{en ? "No team member registered." : "Aucun membre d'equipe enregistre."}</p>}
        </div>
        <form onSubmit={addTeamMember} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input name="full_name" placeholder={en ? "Full name" : "Nom complet"} className="admin-input" />
          <select name="role" defaultValue="coges_member" className="admin-input">{Object.entries(teamRoleLabels).map(([value, label]) => <option key={value} value={value}>{label[en ? "en" : "fr"]}</option>)}</select>
          <input name="phone" placeholder={en ? "Phone" : "Telephone"} className="admin-input" />
          <input name="email" type="email" placeholder="Email" className="admin-input" />
          <button className="btn-secondary justify-self-start px-4 py-2 text-sm sm:col-span-2">{en ? "Add member" : "Ajouter un membre"}</button>
        </form>
      </section>
    </div>
  </div>;
}
