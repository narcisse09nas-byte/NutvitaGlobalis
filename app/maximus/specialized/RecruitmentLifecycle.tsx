'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CalendarPlus, CheckCircle2, ClipboardCheck, FileSignature, UserCheck, X } from 'lucide-react';

type Application = { id: string; full_name: string; email: string; status: string; written_test_score?: number; interview_score?: number; maximus_job_offers?: { title: string; reference: string; contract_type?: string } };
type Interview = { id: string; application_id: string; scheduled_at: string; provider: string; meeting_url: string; status: string; maximus_staff_applications?: Application; maximus_interview_evaluations?: Array<{ overall_score: number }> };
type Proposal = { id: string; application_id: string; position_title: string; status: string; salary_amount?: number; salary_currency: string };

export default function RecruitmentLifecycle() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [target, setTarget] = useState<Application | null>(null);
  const [mode, setMode] = useState<'interview' | 'proposal' | 'evaluation' | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/recruitment/lifecycle', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Chargement impossible.');
    setApplications(payload.applications || []);
    setInterviews(payload.interviews || []);
    setProposals(payload.proposals || []);
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Chargement impossible.')); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || !mode) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/maximus/recruitment/lifecycle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, action: mode === 'interview' ? 'schedule_interview' : mode === 'proposal' ? 'propose_employment' : 'evaluate_interview', application_id: target.id, interview_id: interview?.id }),
    });
    const payload = await response.json();
    if (!response.ok) return setError(payload.message || 'Action impossible.');
    setMessage(mode === 'interview' ? 'Entretien programme et invitations envoyees.' : mode === 'proposal' ? 'Proposition envoyee au candidat.' : 'Evaluation enregistree.');
    setMode(null); setTarget(null); setInterview(null); await load();
  }

  async function hire(application: Application) {
    if (!confirm(`Finaliser le recrutement de ${application.full_name} et creer son onboarding ?`)) return;
    const response = await fetch('/api/maximus/recruitment/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'hire', application_id: application.id }) });
    const payload = await response.json();
    if (!response.ok) return setError(payload.message || 'Finalisation impossible.');
    setMessage('Recrutement finalise, dossier personnel et onboarding crees.');
    await load();
  }

  return <div className="grid gap-5">
    <div><h2 className="text-3xl font-black">Entretiens et decisions</h2><p className="mt-1 text-sm text-slate-500">Programmation, jurys, evaluations, propositions et integration.</p></div>
    {message && <p className="rounded-md bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
    {error && <p className="rounded-md bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
    <section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Candidats actifs</h3><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Candidat</th><th className="p-3">Poste</th><th className="p-3">Test</th><th className="p-3">Entretien</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{applications.map(application => {
      const currentInterview = interviews.find(item => item.application_id === application.id);
      const proposal = proposals.find(item => item.application_id === application.id);
      return <tr key={application.id} className="border-b"><td className="p-3 font-semibold">{application.full_name}<span className="block text-xs font-normal text-slate-400">{application.email}</span></td><td className="p-3">{application.maximus_job_offers?.title}</td><td className="p-3">{application.written_test_score ?? 'N/A'}</td><td className="p-3">{application.interview_score ?? 'N/A'}</td><td className="p-3">{application.status}{proposal && <span className="block text-xs text-slate-400">Proposition: {proposal.status}</span>}</td><td className="p-3"><div className="flex justify-end gap-2">{!currentInterview && <button title="Programmer" onClick={() => { setTarget(application); setMode('interview'); }} className="rounded-md border p-2"><CalendarPlus className="h-4 w-4" /></button>}{currentInterview && <>{currentInterview.provider === 'physical' ? <span className="rounded-md border px-3 py-2 text-xs font-bold">{currentInterview.meeting_url}</span> : <a href={currentInterview.meeting_url} target="_blank" rel="noreferrer" className="rounded-md border px-3 py-2 font-bold">Rejoindre</a>}<button title="Evaluer" onClick={() => { setTarget(application); setInterview(currentInterview); setMode('evaluation'); }} className="rounded-md border p-2"><ClipboardCheck className="h-4 w-4" /></button></>}{application.status === 'interview_completed' && !proposal && <button title="Proposer l embauche" onClick={() => { setTarget(application); setMode('proposal'); }} className="rounded-md bg-[#24945f] p-2 text-white"><FileSignature className="h-4 w-4" /></button>}{application.status === 'offer_accepted' && <button title="Finaliser" onClick={() => hire(application)} className="rounded-md bg-[#24945f] p-2 text-white"><UserCheck className="h-4 w-4" /></button>}{application.status === 'hired' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}</div></td></tr>;
    })}{!applications.length && <tr><td colSpan={6} className="h-28 text-center text-slate-500">Aucun candidat rendu a cette etape.</td></tr>}</tbody></table></div></section>
    {mode && target && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onMouseDown={() => setMode(null)}><form onSubmit={submit} onMouseDown={event => event.stopPropagation()} className="grid w-full max-w-2xl gap-5 rounded-lg bg-white p-6 shadow-2xl"><header className="flex justify-between"><div><h3 className="text-xl font-black">{mode === 'interview' ? 'Programmer l entretien' : mode === 'proposal' ? 'Proposition d embauche' : 'Evaluation de l entretien'}</h3><p className="text-sm text-slate-500">{target.full_name}</p></div><button type="button" onClick={() => setMode(null)}><X className="h-5 w-5" /></button></header>{mode === 'interview' && <><Field label="Mode de reunion"><select className="admin-input" name="provider" defaultValue="external"><option value="external">Lien externe - Google Meet, Zoom, Teams...</option><option value="jitsi">Jitsi integre</option><option value="physical">Entretien presentiel</option></select></Field><Field label="Lien HTTPS ou lieu"><input className="admin-input" name="meeting_url" placeholder="https://... ou adresse du rendez-vous" /></Field><Field label="Date et heure"><input className="admin-input" type="datetime-local" name="scheduled_at" required /></Field><Field label="Duree (minutes)"><input className="admin-input" type="number" name="duration_minutes" defaultValue="45" min="15" required /></Field><Field label="Emails du jury"><textarea className="admin-input" name="panel_emails" placeholder="jury1@..., jury2@..." required /></Field><Field label="Ordre du jour"><textarea className="admin-input" name="agenda" /></Field></>}{mode === 'proposal' && <><Field label="Poste"><input className="admin-input" name="position_title" defaultValue={target.maximus_job_offers?.title} required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Type de contrat"><input className="admin-input" name="contract_type" defaultValue={target.maximus_job_offers?.contract_type} /></Field><Field label="Date de prise de fonction"><input className="admin-input" name="proposed_start_date" type="date" /></Field><Field label="Salaire"><input className="admin-input" name="salary_amount" type="number" min="0" /></Field><Field label="Devise"><input className="admin-input" name="salary_currency" defaultValue="XAF" /></Field></div><Field label="Termes"><textarea className="admin-input min-h-28" name="terms" required /></Field></>}{mode === 'evaluation' && <><div className="grid gap-4 sm:grid-cols-3"><Field label="Technique /100"><input className="admin-input" name="technical_score" type="number" min="0" max="100" required /></Field><Field label="Communication /100"><input className="admin-input" name="communication_score" type="number" min="0" max="100" required /></Field><Field label="Culture /100"><input className="admin-input" name="culture_score" type="number" min="0" max="100" required /></Field></div><Field label="Recommandation"><select className="admin-input" name="recommendation" required><option value="hire">Recruter</option><option value="reserve">Reserve</option><option value="reject">Ne pas retenir</option></select></Field><Field label="Commentaires"><textarea className="admin-input min-h-24" name="comments" /></Field></>}<div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setMode(null)} className="rounded-md border px-4 py-2 font-bold">Annuler</button><button className="rounded-md bg-[#24945f] px-4 py-2 font-bold text-white">Enregistrer</button></div></form></div>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>; }
