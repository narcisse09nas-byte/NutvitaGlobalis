"use client";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

// Mirrors components/partner/PartnerClientManager.tsx's table/search/"create" UX. No "Transferer"
// action here — medical has no assigned_partner_id/created_by_partner_id equivalent, so there is
// no concept of handing a patient off to a colleague the way a nutritionist can.
type Row = Record<string, any>;
const age = (birth?: string) => birth ? Math.max(0, new Date().getFullYear() - new Date(birth).getFullYear()) : "—";

export default function MedicalPatientManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const filtered = useMemo(() => rows.filter(row => [row.client_number, row.full_name, row.email].join(" ").toLowerCase().includes(query.toLowerCase())), [rows, query]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/medical/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    setLoading(false);
    if (response.ok) { setRows(current => [data.client, ...current]); setOpen(false); form.reset(); setMessage("Patient cree. Son dossier est immediatement disponible."); }
    else setMessage(data.message || "Creation impossible.");
  }

  return <section className="grid gap-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black">Mes patients</h1><p className="mt-2 text-slate-500">Registre unique des patients vus en consultation.</p></div><button onClick={() => setOpen(true)} className="btn-primary">+ Nouveau patient</button></header>
    {message && <p className="rounded-xl bg-mint p-3 text-sm font-bold text-leaf">{message}</p>}
    <div className="rounded-2xl border bg-white p-4"><input value={query} onChange={event => setQuery(event.target.value)} className="admin-input" placeholder="Rechercher par ID, nom ou email…" /></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["ID patient", "Nom du patient", "Age", "Email", "Actions"].map(heading => <th key={heading} className="p-4">{heading}</th>)}</tr></thead>
        <tbody className="divide-y">{filtered.map(row => <tr key={row.id}>
          <td className="p-4 font-black text-forest">{row.client_number || "En generation"}</td>
          <td className="p-4 font-bold">{row.full_name}</td>
          <td className="p-4">{age(row.birth_date)}</td>
          <td className="p-4">{row.email || "—"}</td>
          <td className="p-4"><div className="flex flex-wrap gap-2 font-bold">
            <Link href={`/medecin-specialiste/consultations?client=${row.id}`} className="btn-secondary px-3 py-2">Consultations</Link>
            <Link href={`/medecin-specialiste/messages?client=${row.id}`} className="btn-primary px-3 py-2">Message</Link>
          </div></td>
        </tr>)}{!filtered.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun patient ne correspond aux filtres.</td></tr>}</tbody>
      </table>
    </div>
    {open && <div className="fixed inset-0 z-[130] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={create} className="mx-auto my-8 grid max-w-2xl gap-4 rounded-3xl bg-white p-7 md:grid-cols-2">
        <div className="flex justify-between md:col-span-2"><div><h2 className="text-2xl font-black">Nouveau patient</h2><p className="text-sm text-slate-500">Le dossier de consultation sera cree automatiquement.</p></div><button type="button" onClick={() => setOpen(false)} className="text-3xl">×</button></div>
        <Field label="Nom complet" name="full_name" required /><Field label="Email" name="email" type="email" required />
        <Field label="Telephone" name="phone" /><Field label="Date de naissance" name="birth_date" type="date" />
        <label className="grid gap-2 text-sm font-bold">Sexe<select name="sex" className="admin-input"><option value="">Selectionner</option><option value="female">Femme</option><option value="male">Homme</option><option value="other">Autre</option></select></label>
        <div />
        <label className="grid gap-2 text-sm font-bold md:col-span-2">Motif de consultation<textarea name="chief_complaint" className="admin-input" /></label>
        {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 md:col-span-2">{message}</p>}
        <button disabled={loading} className="btn-primary justify-self-start md:col-span-2">{loading ? "Creation..." : "Creer le patient et son dossier"}</button>
      </form>
    </div>}
  </section>;
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm font-bold">{label}<input name={name} type={type} required={required} className="admin-input" /></label>;
}
