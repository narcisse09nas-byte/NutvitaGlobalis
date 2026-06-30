'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, MailCheck, Search, Send, X, XCircle } from 'lucide-react';

type Offer = { id: string; reference: string; title: string; department: string };
type Test = { id: string; offer_id: string; title: string; duration_minutes: number; pass_score: number };
type Application = {
  id: string; offer_id: string; full_name: string; email: string; phone?: string; professional_title?: string;
  highest_degree?: string; years_experience?: number; cover_letter?: string; documents: Record<string, { name?: string; url?: string }>;
  status: string; written_test_score?: number; interview_score?: number; final_score?: number; submitted_at?: string;
  maximus_job_offers?: Offer; maximus_test_assignments?: Array<{ id: string; status: string; final_score?: number; maximus_written_tests?: { title: string } }>;
};

const labels: Record<string, string> = {
  submitted: 'Recue', under_review: 'En analyse', invited_to_test: 'Invite au test',
  test_in_progress: 'Test en cours', test_submitted: 'Test soumis', test_graded: 'Test corrige',
  invited_to_interview: 'Invite a l entretien', interview_completed: 'Entretien termine',
  offer_proposed: 'Offre proposee', offer_accepted: 'Offre acceptee', hired: 'Recrute',
  rejected: 'Non retenu', withdrawn: 'Retire',
};

export default function RecruitmentApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selected, setSelected] = useState<Application | null>(null);
  const [testTarget, setTestTarget] = useState<Application | null>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [offerFilter, setOfferFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/recruitment/applications');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Impossible de charger les candidatures.');
    setApplications(payload.items || []);
    setTests(payload.tests || []);
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Chargement impossible.')); }, []);

  const offers = useMemo(() => {
    const map = new Map<string, Offer>();
    applications.forEach(item => { if (item.maximus_job_offers) map.set(item.offer_id, item.maximus_job_offers); });
    return [...map.values()];
  }, [applications]);
  const filtered = useMemo(() => applications.filter(item => {
    const haystack = `${item.full_name} ${item.email} ${item.maximus_job_offers?.title} ${item.professional_title}`.toLowerCase();
    return haystack.includes(search.toLowerCase())
      && (offerFilter === 'all' || item.offer_id === offerFilter)
      && (statusFilter === 'all' || item.status === statusFilter);
  }), [applications, search, offerFilter, statusFilter]);
  const targetTests = testTarget ? tests.filter(test => test.offer_id === testTarget.offer_id) : [];

  async function action(application: Application, actionName: 'review' | 'invite_test' | 'reject', testIds: string[] = []) {
    let note = '';
    if (actionName === 'reject') {
      note = window.prompt('Message courtois adresse au candidat :')?.trim() || '';
      if (!note) return;
    }
    setBusy(application.id);
    setError('');
    const response = await fetch('/api/maximus/recruitment/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: application.id, action: actionName, test_ids: testIds, note }),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Action impossible.');
    setTestTarget(null);
    setSelectedTests([]);
    setMessage(actionName === 'invite_test' ? 'Epreuve envoyee et candidat notifie.' : actionName === 'reject' ? 'Decision envoyee au candidat.' : 'Analyse demarree et candidat notifie.');
    await load();
  }

  return <div className="grid gap-5 text-slate-950">
    <div><h2 className="text-3xl font-black">Candidatures Staff</h2><p className="mt-1 text-sm text-slate-500">Suivi central de chaque candidat, de la reception a la decision finale.</p></div>
    {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{message}</p>}
    {error && <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-3"><label className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input w-full min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Candidat, email, poste..." /></label><select className="admin-input min-w-56" value={offerFilter} onChange={event => setOfferFilter(event.target.value)}><option value="all">Toutes les offres</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.title}</option>)}</select><select className="admin-input min-w-48" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Candidat</th><th className="p-3">Poste</th><th className="p-3">Statut</th><th className="p-3">Test ecrit</th><th className="p-3">Entretien</th><th className="p-3">Score final</th><th className="p-3">Soumission</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{filtered.length ? filtered.map(item => <tr key={item.id} className="border-b"><td className="p-3"><p className="font-semibold">{item.full_name}</p><p className="text-xs text-slate-500">{item.email}</p></td><td className="p-3"><p>{item.maximus_job_offers?.title}</p><p className="font-mono text-xs text-slate-400">{item.maximus_job_offers?.reference}</p></td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === 'rejected' ? 'bg-red-100 text-red-800' : item.status === 'hired' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{labels[item.status] || item.status}</span></td><td className="p-3 font-semibold">{item.written_test_score ?? assignmentAverage(item) ?? 'N/A'}</td><td className="p-3 font-semibold">{item.interview_score ?? 'N/A'}</td><td className="p-3 font-semibold">{item.final_score ?? 'N/A'}</td><td className="p-3">{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('fr-FR') : 'N/A'}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setSelected(item)} title="Voir le dossier" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>{item.status === 'submitted' && <button disabled={busy === item.id} onClick={() => action(item, 'review')} title="Demarrer l analyse" className="rounded-md border p-2"><MailCheck className="h-4 w-4" /></button>}{['submitted','under_review','test_graded'].includes(item.status) && <button disabled={busy === item.id} onClick={() => { setTestTarget(item); setSelectedTests([]); }} title="Inviter au test" className="rounded-md bg-[#24945f] p-2 text-white"><Send className="h-4 w-4" /></button>}{!['rejected','hired'].includes(item.status) && <button disabled={busy === item.id} onClick={() => action(item, 'reject')} title="Ne pas poursuivre" className="rounded-md bg-red-600 p-2 text-white"><XCircle className="h-4 w-4" /></button>}</div></td></tr>) : <tr><td colSpan={8} className="h-32 text-center text-slate-500">Aucune candidature ne correspond aux filtres.</td></tr>}</tbody></table></div>
    </section>

    {selected && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}><section className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">{selected.full_name}</h3><p className="mt-1 text-sm text-slate-500">{selected.maximus_job_offers?.title}</p></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6"><div className="grid gap-4 text-sm sm:grid-cols-2">{[['Email',selected.email],['Telephone',selected.phone],['Titre professionnel',selected.professional_title],['Diplome',selected.highest_degree],['Experience',`${selected.years_experience || 0} an(s)`],['Statut',labels[selected.status] || selected.status]].map(([label,value]) => <div key={label}><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold">{value || 'N/A'}</p></div>)}</div><div><h4 className="font-black">Lettre de motivation</h4><p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-4 text-sm leading-6">{selected.cover_letter || 'N/A'}</p></div><div><h4 className="font-black">Documents</h4><div className="mt-3 flex flex-wrap gap-3">{Object.entries(selected.documents || {}).map(([key, document]) => document.url && <a key={key} href={document.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold text-leaf"><FileText className="h-4 w-4" />{document.name || key}</a>)}</div></div></div></section></div>}

    {testTarget && <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setTestTarget(null)}><section className="w-full max-w-xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-xl font-black">Inviter au test ecrit</h3><p className="mt-1 text-sm text-slate-500">{testTarget.full_name} · {testTarget.maximus_job_offers?.title}</p></div><button onClick={() => setTestTarget(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-3 p-6">{targetTests.length ? targetTests.map(test => <label key={test.id} className="flex gap-3 rounded-md border p-4"><input type="checkbox" checked={selectedTests.includes(test.id)} onChange={event => setSelectedTests(current => event.target.checked ? [...current, test.id] : current.filter(id => id !== test.id))} /><span><b>{test.title}</b><span className="mt-1 block text-xs text-slate-500">{test.duration_minutes} minutes · Passage {test.pass_score}%</span></span></label>) : <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">Aucune epreuve validee pour cette offre. Creez et validez d abord une epreuve dans la sous-session Tests ecrits.</p>}<div className="mt-3 flex justify-end gap-3 border-t pt-5"><button onClick={() => setTestTarget(null)} className="rounded-md border px-4 py-2 font-bold">Annuler</button><button disabled={!selectedTests.length || busy === testTarget.id} onClick={() => action(testTarget, 'invite_test', selectedTests)} className="rounded-md bg-[#24945f] px-4 py-2 font-bold text-white disabled:opacity-40">Envoyer {selectedTests.length || ''} epreuve(s)</button></div></div></section></div>}
  </div>;
}

function assignmentAverage(application: Application) {
  const values = (application.maximus_test_assignments || []).map(item => item.final_score).filter((value): value is number => typeof value === 'number');
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : null;
}
