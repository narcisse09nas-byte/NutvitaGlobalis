'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive, CheckCircle2, Edit, Eye, FileCheck2, Globe2, Loader2,
  Plus, RotateCcw, Send, ShieldCheck, Trash2, X, XCircle,
} from 'lucide-react';

type OfferStatus = 'draft' | 'submitted' | 'endorsed' | 'validated' | 'rejected' | 'published' | 'closed' | 'archived';

type Offer = {
  id: string;
  reference: string;
  title: string;
  department: string;
  contract_type: string;
  location?: string | null;
  country?: string | null;
  region?: string | null;
  summary: string;
  terms_of_reference: string;
  responsibilities?: string | null;
  requirements?: string | null;
  application_instructions?: string | null;
  closing_at?: string | null;
  status: OfferStatus;
  rejection_reason?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

type GeoOption = { code?: string; name: string };

const statusLabels: Record<OfferStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumise',
  endorsed: 'Endossee',
  validated: 'Validee',
  rejected: 'Rejetee',
  published: 'Publiee',
  closed: 'Fermee',
  archived: 'Archivee',
};

const statusStyles: Record<OfferStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-amber-100 text-amber-800',
  endorsed: 'bg-sky-100 text-sky-800',
  validated: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  published: 'bg-[#123d32] text-white',
  closed: 'bg-violet-100 text-violet-800',
  archived: 'bg-slate-200 text-slate-600',
};

const departments = ['Cabinet', 'Restauration', 'Production', 'Finance', 'Ressources humaines', 'Operations', 'Communication', 'Informatique', 'Autre'];
const contractTypes = ['CDI', 'CDD', 'Consultance', 'Stage', 'Prestation', 'Autre'];

export default function RecruitmentOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [viewing, setViewing] = useState<Offer | null>(null);
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState<GeoOption[]>([]);
  const [regions, setRegions] = useState<GeoOption[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/recruitment/offers');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Impossible de charger les offres.');
    setOffers(payload.items || []);
  }

  useEffect(() => {
    load().catch(reason => setError(reason instanceof Error ? reason.message : 'Impossible de charger les offres.'));
    fetch('/api/geo?type=countries')
      .then(response => response.ok ? response.json() : [])
      .then(setCountries)
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!country) return setRegions([]);
    fetch(`/api/geo?type=states&country=${encodeURIComponent(country)}`)
      .then(response => response.ok ? response.json() : [])
      .then(setRegions)
      .catch(() => setRegions([]));
  }, [country]);
  const filtered = useMemo(() => offers.filter(offer => {
    const haystack = `${offer.reference} ${offer.title} ${offer.department} ${offer.location}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || offer.status === statusFilter);
  }), [offers, search, statusFilter]);

  function openForm(offer?: Offer) {
    setEditing(offer || null);
    setCountry(offer?.country || '');
    setError('');
    setMessage('');
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const fields = {
      title: String(values.title || '').trim(),
      department: String(values.department || ''),
      contract_type: String(values.contract_type || ''),
      location: String(values.location || '').trim(),
      country: String(values.country || ''),
      region: String(values.region || ''),
      summary: String(values.summary || '').trim(),
      terms_of_reference: String(values.terms_of_reference || '').trim(),
      responsibilities: String(values.responsibilities || '').trim(),
      requirements: String(values.requirements || '').trim(),
      application_instructions: String(values.application_instructions || '').trim(),
      closing_at: values.closing_at || null,
    };
    setBusy('save');
    setError('');
    const response = await fetch('/api/maximus/recruitment/offers', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, title: fields.title, fields } : fields),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Impossible d enregistrer l offre.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Offre mise a jour.' : 'Offre creee en brouillon.');
    await load();
  }

  async function transition(offer: Offer, action: OfferStatus) {
    let note = '';
    if (action === 'rejected') {
      note = window.prompt('Motif du rejet (obligatoire) :')?.trim() || '';
      if (!note) return;
    }
    setBusy(offer.id);
    setError('');
    const response = await fetch('/api/maximus/recruitment/offers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: offer.id, action, note }),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Transition impossible.');
    setMessage(`Offre ${statusLabels[action].toLowerCase()} avec succes.`);
    if (viewing?.id === offer.id) setViewing(payload.item);
    await load();
  }

  async function remove(offer: Offer) {
    if (!window.confirm(`Supprimer definitivement l offre "${offer.title}" ?`)) return;
    setBusy(offer.id);
    const response = await fetch(`/api/maximus/recruitment/offers?id=${encodeURIComponent(offer.id)}`, { method: 'DELETE' });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Suppression impossible.');
    setMessage('Offre supprimee.');
    await load();
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-3xl font-black">Appels a candidatures</h2><p className="mt-1 text-sm text-slate-500">Elaborez les TOR, faites approuver les offres et publiez-les sur NutVitaGlobalis.</p></div>
      <button onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Creer une offre</button>
    </div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}
    {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">Registre des offres</h3><p className="mt-1 text-sm text-slate-500">Chaque offre suit un circuit formel avant publication.</p></div><div className="flex gap-3"><input className="admin-input min-w-64" value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher une offre..." /><select className="admin-input min-w-44" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Reference</th><th className="p-3">Poste</th><th className="p-3">Departement</th><th className="p-3">Contrat</th><th className="p-3">Lieu</th><th className="p-3">Cloture</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
        {filtered.length ? filtered.map(offer => <tr key={offer.id} className="border-b"><td className="p-3 font-mono text-xs">{offer.reference}</td><td className="p-3 font-semibold">{offer.title}</td><td className="p-3">{offer.department}</td><td className="p-3">{offer.contract_type}</td><td className="p-3">{offer.location || 'N/A'}</td><td className="p-3">{offer.closing_at ? new Date(offer.closing_at).toLocaleDateString('fr-FR') : 'Ouverte'}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyles[offer.status]}`}>{statusLabels[offer.status]}</span></td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setViewing(offer)} title="Consulter" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>{['draft','rejected'].includes(offer.status) && <button onClick={() => openForm(offer)} title="Modifier" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>}<WorkflowButtons offer={offer} busy={busy === offer.id} transition={transition} />{['draft','rejected'].includes(offer.status) && <button onClick={() => remove(offer)} title="Supprimer" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>)
          : <tr><td colSpan={8} className="h-32 text-center text-slate-500">Aucune offre ne correspond aux filtres.</td></tr>}
      </tbody></table></div>
    </section>

    {formOpen && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="mx-auto my-6 w-full max-w-5xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Communication et recrutement</p><h3 className="mt-1 text-2xl font-black">{editing ? 'Modifier l offre' : 'Nouvelle offre d emploi'}</h3><p className="mt-1 text-sm text-slate-500">Le document restera en brouillon jusqu a sa soumission.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header><form onSubmit={save} className="grid gap-5 p-6">
      <div className="grid gap-5 md:grid-cols-2"><Field label="Intitule du poste"><input className="admin-input" name="title" defaultValue={editing?.title || ''} required minLength={4} /></Field><Field label="Departement"><select className="admin-input" name="department" defaultValue={editing?.department || ''} required><option value="">Selectionner</option>{departments.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Type de contrat"><select className="admin-input" name="contract_type" defaultValue={editing?.contract_type || ''} required><option value="">Selectionner</option>{contractTypes.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Lieu d affectation"><input className="admin-input" name="location" defaultValue={editing?.location || ''} /></Field><Field label="Pays"><select className="admin-input" name="country" value={country} onChange={event => setCountry(event.target.value)}><option value="">Selectionner</option>{countries.map(item => <option key={item.code || item.name} value={item.name}>{item.name}</option>)}</select></Field><Field label="Region / Etat"><select className="admin-input" name="region" defaultValue={editing?.region || ''} disabled={!country}><option value="">Selectionner</option>{regions.map(item => <option key={item.code || item.name} value={item.name}>{item.name}</option>)}</select></Field><Field label="Date limite"><input className="admin-input" name="closing_at" type="datetime-local" defaultValue={editing?.closing_at?.slice(0, 16) || ''} /></Field></div>
      <Field label="Resume de l offre"><textarea className="admin-input min-h-24" name="summary" defaultValue={editing?.summary || ''} required minLength={20} /></Field>
      <Field label="Termes de reference (TOR)"><textarea className="admin-input min-h-56" name="terms_of_reference" defaultValue={editing?.terms_of_reference || ''} required minLength={50} placeholder="Contexte, objectif du poste, livrables, liens hierarchiques et conditions..." /></Field>
      <div className="grid gap-5 md:grid-cols-2"><Field label="Responsabilites"><textarea className="admin-input min-h-40" name="responsibilities" defaultValue={editing?.responsibilities || ''} /></Field><Field label="Profil et exigences"><textarea className="admin-input min-h-40" name="requirements" defaultValue={editing?.requirements || ''} /></Field></div>
      <Field label="Instructions de candidature"><textarea className="admin-input min-h-24" name="application_instructions" defaultValue={editing?.application_instructions || ''} /></Field>
      <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-5 py-3 text-sm font-bold">Annuler</button><button disabled={busy === 'save'} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy === 'save' && <Loader2 className="h-4 w-4 animate-spin" />}{editing ? 'Enregistrer les modifications' : 'Creer le brouillon'}</button></div>
    </form></section></div>}

    {viewing && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="mx-auto my-6 w-full max-w-4xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{viewing.reference}</p><h3 className="mt-1 text-2xl font-black">{viewing.title}</h3><span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${statusStyles[viewing.status]}`}>{statusLabels[viewing.status]}</span></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6"><div className="grid gap-4 text-sm sm:grid-cols-3"><Detail label="Departement" value={viewing.department} /><Detail label="Contrat" value={viewing.contract_type} /><Detail label="Lieu" value={viewing.location || 'N/A'} /></div><Section title="Resume" text={viewing.summary} /><Section title="Termes de reference" text={viewing.terms_of_reference} /><div className="grid gap-5 md:grid-cols-2"><Section title="Responsabilites" text={viewing.responsibilities || 'N/A'} /><Section title="Exigences" text={viewing.requirements || 'N/A'} /></div>{viewing.rejection_reason && <div className="rounded-md border border-red-200 bg-red-50 p-4"><p className="font-bold text-red-800">Motif du rejet</p><p className="mt-2 text-sm text-red-700">{viewing.rejection_reason}</p></div>}<div className="flex flex-wrap justify-end gap-2 border-t pt-5"><WorkflowButtons offer={viewing} busy={busy === viewing.id} transition={transition} /><button onClick={() => setViewing(null)} className="rounded-md border px-4 py-2 text-sm font-bold">Fermer</button></div></div></section></div>}
  </div>;
}

function WorkflowButtons({ offer, busy, transition }: { offer: Offer; busy: boolean; transition: (offer: Offer, action: OfferStatus) => void }) {
  if (busy) return <span className="grid h-9 w-9 place-items-center"><Loader2 className="h-4 w-4 animate-spin" /></span>;
  if (offer.status === 'draft') return <Action title="Soumettre" icon={Send} onClick={() => transition(offer, 'submitted')} />;
  if (offer.status === 'submitted') return <><Action title="Endosser" icon={ShieldCheck} onClick={() => transition(offer, 'endorsed')} /><Action title="Rejeter" icon={XCircle} danger onClick={() => transition(offer, 'rejected')} /></>;
  if (offer.status === 'endorsed') return <><Action title="Valider" icon={CheckCircle2} onClick={() => transition(offer, 'validated')} /><Action title="Rejeter" icon={XCircle} danger onClick={() => transition(offer, 'rejected')} /></>;
  if (offer.status === 'validated') return <><Action title="Publier" icon={Globe2} onClick={() => transition(offer, 'published')} /><Action title="Rejeter" icon={XCircle} danger onClick={() => transition(offer, 'rejected')} /></>;
  if (offer.status === 'rejected') return <Action title="Remettre en brouillon" icon={RotateCcw} onClick={() => transition(offer, 'draft')} />;
  if (offer.status === 'published') return <Action title="Fermer l offre" icon={FileCheck2} onClick={() => transition(offer, 'closed')} />;
  if (offer.status === 'closed') return <Action title="Archiver" icon={Archive} onClick={() => transition(offer, 'archived')} />;
  return null;
}

function Action({ title, icon: Icon, onClick, danger = false }: { title: string; icon: typeof Send; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} title={title} className={`rounded-md p-2 ${danger ? 'bg-red-600 text-white' : 'border bg-white text-slate-800'}`}><Icon className="h-4 w-4" /></button>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>;
}

function Section({ title, text }: { title: string; text: string }) {
  return <section><h4 className="font-black">{title}</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</p></section>;
}
