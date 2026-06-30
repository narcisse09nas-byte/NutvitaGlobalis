'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BriefcaseBusiness, FileText, LogOut, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CandidateWrittenTests from './CandidateWrittenTests';

type Offer = { id: string; reference: string; title: string; department: string; location?: string; contract_type: string; summary: string };
type Application = {
  id: string; offer_id: string; status: string; written_test_score?: number; interview_score?: number;
  submitted_at?: string; updated_at: string;
  maximus_job_offers?: Offer;
};
type Notification = { id: string; title: string; message: string; action_url?: string; created_at: string };
type Interview = { id: string; scheduled_at: string; duration_minutes: number; provider: string; meeting_url: string; status: string; maximus_staff_applications?: { maximus_job_offers?: { title: string; reference: string } } };
type Proposal = { id: string; position_title: string; contract_type?: string; proposed_start_date?: string; salary_amount?: number; salary_currency: string; terms?: string; status: string };

const statuses: Record<string, string> = {
  draft: 'Brouillon', submitted: 'Candidature soumise', under_review: 'En cours d analyse',
  invited_to_test: 'Invite au test ecrit', test_in_progress: 'Test en cours',
  test_submitted: 'Test soumis', test_graded: 'Test corrige',
  invited_to_interview: 'Invite a l entretien', interview_completed: 'Entretien termine',
  offer_proposed: 'Proposition d embauche', offer_accepted: 'Proposition acceptee',
  offer_declined: 'Proposition declinee', hired: 'Recrute', rejected: 'Candidature non retenue', withdrawn: 'Candidature retiree',
};

export default function StaffCandidatePortal({ email, fullName }: { email: string; fullName: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const params = useSearchParams();
  const router = useRouter();

  async function load() {
    const [offerResponse, applicationResponse] = await Promise.all([fetch('/api/careers/offers'), fetch('/api/staff-candidate/applications')]);
    const offerPayload = await offerResponse.json();
    const applicationPayload = await applicationResponse.json();
    setOffers(offerResponse.ok ? offerPayload.items || [] : []);
    setApplications(applicationResponse.ok ? applicationPayload.items || [] : []);
    setNotifications(applicationResponse.ok ? applicationPayload.notifications || [] : []);
    setInterviews(applicationResponse.ok ? applicationPayload.interviews || [] : []);
    setProposals(applicationResponse.ok ? applicationPayload.proposals || [] : []);
    const requested = params.get('offer');
    if (requested) setSelected((offerPayload.items || []).find((offer: Offer) => offer.id === requested) || null);
  }
  useEffect(() => { load().catch(() => setMessage('Impossible de charger votre espace candidat.')); }, []);
  const appliedIds = useMemo(() => new Set(applications.map(item => item.offer_id)), [applications]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage('');
    const values = new FormData(event.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const documents: Record<string, { path: string; name: string }> = {};
    for (const field of ['cv', 'motivation']) {
      const file = values.get(field) as File;
      if (!file?.size) continue;
      if (file.size > 10 * 1024 * 1024) {
        setMessage(`${file.name} depasse 10 Mo.`);
        setBusy(false);
        return;
      }
      const path = `${user.id}/${selected.id}/${field}-${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g, '_')}`;
      const upload = await supabase.storage.from('maximus-recruitment').upload(path, file);
      if (upload.error) {
        setMessage(upload.error.message);
        setBusy(false);
        return;
      }
      documents[field] = { path, name: file.name };
    }
    const response = await fetch('/api/staff-candidate/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offer_id: selected.id,
        full_name: values.get('full_name'),
        email,
        phone: values.get('phone'),
        address: values.get('address'),
        professional_title: values.get('professional_title'),
        highest_degree: values.get('highest_degree'),
        years_experience: values.get('years_experience'),
        cover_letter: values.get('cover_letter'),
        documents,
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Candidature impossible.');
    setSelected(null);
    setMessage('Votre candidature a ete soumise.');
    router.replace('/staff-candidat');
    await load();
  }

  async function logout() {
    await createClient().auth.signOut();
    router.refresh();
  }
  async function answerProposal(proposalId: string, responseValue: 'accepted' | 'declined') {
    if (!confirm(responseValue === 'accepted' ? 'Confirmer votre accord avec cette proposition ?' : 'Decliner cette proposition ?')) return;
    const response = await fetch('/api/staff-candidate/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposal_id: proposalId, response: responseValue }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.message || 'Reponse impossible.');
    setMessage(responseValue === 'accepted' ? 'Votre accord a ete transmis.' : 'Votre reponse a ete transmise.');
    await load();
  }
  return <div className="min-h-screen bg-slate-100">
    <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5"><div><p className="text-xl font-black text-forest">NutVita<span className="text-orange">Staff</span></p><p className="text-xs text-slate-500">{email}</p></div><button onClick={logout} className="inline-flex items-center gap-2 text-sm font-bold text-forest"><LogOut className="h-4 w-4" />Deconnexion</button></div></header>
    <main className="mx-auto grid max-w-7xl gap-7 px-5 py-8">
      <div><h1 className="text-3xl font-black text-forest">Bonjour {fullName}</h1><p className="mt-2 text-slate-500">Suivez vos candidatures Staff NutVitaGlobalis.</p></div>
      {message && <p className="rounded-lg border bg-white p-4 font-semibold text-forest">{message}</p>}
      <CandidateWrittenTests />
      {interviews.length > 0 && <section className="rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Mes entretiens</h2><div className="mt-4 grid gap-3">{interviews.map(item => <article key={item.id} className="flex flex-col justify-between gap-4 rounded-md border p-4 sm:flex-row sm:items-center"><div><h3 className="font-black">{item.maximus_staff_applications?.maximus_job_offers?.title}</h3><p className="mt-1 text-sm text-slate-500">{new Date(item.scheduled_at).toLocaleString('fr-FR')} · {item.duration_minutes} minutes</p></div>{item.provider === 'physical' ? <span className="rounded-md border px-4 py-2 text-sm font-bold">{item.meeting_url}</span> : <a href={item.meeting_url} target="_blank" rel="noreferrer" className="rounded-md bg-[#24945f] px-4 py-2 text-center text-sm font-bold text-white">Rejoindre l entretien</a>}</article>)}</div></section>}
      {proposals.length > 0 && <section className="rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Propositions d embauche</h2><div className="mt-4 grid gap-4">{proposals.map(item => <article key={item.id} className="rounded-md border p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-black">{item.position_title}</h3><p className="text-sm text-slate-500">{item.contract_type} · Debut propose: {item.proposed_start_date || 'A convenir'}</p></div><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{item.status}</span></div>{item.salary_amount ? <p className="mt-4 font-black">{Number(item.salary_amount).toLocaleString('fr-FR')} {item.salary_currency}</p> : null}<p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.terms}</p>{item.status === 'sent' && <div className="mt-5 flex flex-wrap justify-end gap-3 border-t pt-4"><button onClick={() => answerProposal(item.id, 'declined')} className="rounded-md border px-4 py-2 font-bold">Decliner</button><a href="/signatures" className="rounded-md bg-[#24945f] px-4 py-2 font-bold text-white">Lire et signer la proposition</a></div>}</article>)}</div></section>}
      <section className="rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Mes candidatures</h2><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Poste</th><th className="p-3">Reference</th><th className="p-3">Statut</th><th className="p-3">Test ecrit</th><th className="p-3">Entretien</th><th className="p-3">Soumise le</th></tr></thead><tbody>{applications.length ? applications.map(item => <tr key={item.id} className="border-b"><td className="p-3 font-semibold">{item.maximus_job_offers?.title}</td><td className="p-3 font-mono text-xs">{item.maximus_job_offers?.reference}</td><td className="p-3"><span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-forest">{statuses[item.status] || item.status}</span></td><td className="p-3">{item.written_test_score ?? 'N/A'}</td><td className="p-3">{item.interview_score ?? 'N/A'}</td><td className="p-3">{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('fr-FR') : 'N/A'}</td></tr>) : <tr><td colSpan={6} className="h-28 text-center text-slate-500">Vous n avez encore soumis aucune candidature Staff.</td></tr>}</tbody></table></div></section>
      <section className="rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Offres ouvertes</h2><div className="mt-5 grid gap-3">{offers.map(offer => <article key={offer.id} className="flex flex-col justify-between gap-4 border-b py-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase text-leaf">{offer.department} · {offer.contract_type}</p><h3 className="mt-1 text-lg font-black">{offer.title}</h3><p className="mt-1 text-sm text-slate-500">{offer.location}</p></div>{appliedIds.has(offer.id) ? <span className="text-sm font-bold text-slate-400">Candidature deja soumise</span> : <button onClick={() => setSelected(offer)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-4 py-2 text-sm font-bold text-white"><BriefcaseBusiness className="h-4 w-4" />Postuler</button>}</article>)}</div></section>
      <section className="rounded-lg border bg-white p-6"><h2 className="text-xl font-black">Notifications</h2><div className="mt-5 grid gap-3">{notifications.length ? notifications.map(item => <article key={item.id} className="rounded-md bg-slate-50 p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-black text-forest">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p></div><time className="shrink-0 text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString('fr-FR')}</time></div></article>) : <p className="text-sm text-slate-500">Aucune notification.</p>}</div></section>
    </main>
    {selected && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}><section className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><p className="text-xs font-bold uppercase text-orange">{selected.reference}</p><h2 className="mt-1 text-2xl font-black">{selected.title}</h2></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header><form onSubmit={apply} className="grid gap-5 p-6"><div className="grid gap-5 sm:grid-cols-2"><Field label="Nom complet"><input className="admin-input" name="full_name" defaultValue={fullName} required /></Field><Field label="Telephone"><input className="admin-input" name="phone" type="tel" required /></Field><Field label="Titre professionnel"><input className="admin-input" name="professional_title" required /></Field><Field label="Diplome le plus eleve"><input className="admin-input" name="highest_degree" required /></Field><Field label="Annees d experience"><input className="admin-input" name="years_experience" type="number" min="0" step="0.5" required /></Field><Field label="Adresse"><input className="admin-input" name="address" /></Field></div><Field label="Lettre de motivation"><textarea className="admin-input min-h-36" name="cover_letter" minLength={50} required /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="CV (PDF, image ou DOCX)"><input className="admin-input" name="cv" type="file" accept=".pdf,.docx,image/png,image/jpeg" required /></Field><Field label="Lettre signee (optionnelle)"><input className="admin-input" name="motivation" type="file" accept=".pdf,.docx,image/png,image/jpeg" /></Field></div><div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setSelected(null)} className="rounded-md border px-5 py-3 font-bold">Annuler</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? <FileText className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}{busy ? 'Envoi...' : 'Soumettre ma candidature'}</button></div></form></section></div>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}
