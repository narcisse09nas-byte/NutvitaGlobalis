'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Call = { id: string; reference: string; title: string; category: string; status: string; closing_at?: string };
type Visit = { id: string; status: string; score?: number; recommendation?: string };
type Application = { id: string; company_name: string; contact_name: string; email: string; phone?: string; status: string; maximus_vendor_calls?: Call; maximus_vendor_site_visits?: Visit[] };

export default function VendorRecruitment() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [modal, setModal] = useState<'call' | 'visit' | 'report' | null>(null);
  const [target, setTarget] = useState<Application | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [message, setMessage] = useState('');

  async function load() { const response = await fetch('/api/maximus/recruitment/vendors'); const payload = await response.json(); if (response.ok) { setCalls(payload.calls || []); setApplications(payload.applications || []); } else setMessage(payload.message); }
  useEffect(() => { load(); }, []);
  async function send(urlMethod: 'POST' | 'PATCH', body: Record<string, unknown>) { const response = await fetch('/api/maximus/recruitment/vendors', { method: urlMethod, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) return setMessage(payload.message || 'Action impossible.'); setModal(null); setTarget(null); setMessage('Action enregistree.'); await load(); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    if (modal === 'call') await send('POST', { action: 'create_call', ...values });
    if (modal === 'visit') await send('POST', { action: 'plan_visit', application_id: target?.id, ...values });
    if (modal === 'report') {
      const report = form.get('report') as File;
      let reportPath: string | null = null;
      if (report?.size) {
        const { data: { user } } = await createClient().auth.getUser();
        if (!user) return setMessage('Session requise pour joindre le rapport.');
        reportPath = `${user.id}/vendor-visits/${visit?.id}-${report.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const upload = await createClient().storage.from('maximus-recruitment').upload(reportPath, report, { contentType: report.type, upsert: true });
        if (upload.error) return setMessage(upload.error.message);
      }
      delete values.report;
      await send('PATCH', { action: 'complete_visit', id: visit?.id, ...values, report_path: reportPath });
    }
  }

  return <div className="grid gap-5"><div className="flex items-center justify-between gap-4"><div><h2 className="text-3xl font-black">Recrutement fournisseurs</h2><p className="mt-1 text-sm text-slate-500">Appels, candidatures, descentes terrain et decisions documentees.</p></div><button onClick={() => setModal('call')} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-4 py-3 font-bold text-white"><Plus className="h-4 w-4" />Nouvel appel</button></div>{message && <p className="rounded-md border bg-white p-4 font-semibold">{message}</p>}
    <section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Appels fournisseurs</h3><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Reference</th><th className="p-3">Appel</th><th className="p-3">Categorie</th><th className="p-3">Statut</th><th className="p-3 text-right">Workflow</th></tr></thead><tbody>{calls.map(call => <tr key={call.id} className="border-b"><td className="p-3 font-mono">{call.reference}</td><td className="p-3 font-semibold">{call.title}</td><td className="p-3">{call.category}</td><td className="p-3">{call.status}</td><td className="p-3 text-right"><Workflow call={call} action={status => send('PATCH', { action: 'transition_call', id: call.id, status })} /></td></tr>)}{!calls.length && <tr><td colSpan={5} className="h-24 text-center text-slate-500">Aucun appel fournisseur.</td></tr>}</tbody></table></div></section>
    <section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Candidatures et visites terrain</h3><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Entreprise</th><th className="p-3">Appel</th><th className="p-3">Contact</th><th className="p-3">Statut</th><th className="p-3">Visite</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{applications.map(item => { const current = item.maximus_vendor_site_visits?.[0]; return <tr key={item.id} className="border-b"><td className="p-3 font-semibold">{item.company_name}</td><td className="p-3">{item.maximus_vendor_calls?.title}</td><td className="p-3">{item.contact_name}<span className="block text-xs text-slate-400">{item.email}</span></td><td className="p-3">{item.status}</td><td className="p-3">{current ? `${current.status}${current.score != null ? ` · ${current.score}/100` : ''}` : 'Non planifiee'}</td><td className="p-3"><div className="flex justify-end gap-2">{!current && <button title="Planifier la visite" onClick={() => { setTarget(item); setModal('visit'); }} className="rounded-md border p-2"><ClipboardCheck className="h-4 w-4" /></button>}{current?.status === 'planned' && <button title="Rapport terrain" onClick={() => { setTarget(item); setVisit(current); setModal('report'); }} className="rounded-md bg-[#24945f] p-2 text-white"><Send className="h-4 w-4" /></button>}{item.status === 'site_visit_completed' && <><button onClick={() => send('PATCH', { action: 'decide_application', id: item.id, decision: 'approve', note: 'Approuve apres visite terrain.' })} className="rounded-md bg-[#24945f] px-3 py-2 font-bold text-white">Approuver</button><button onClick={() => send('PATCH', { action: 'decide_application', id: item.id, decision: 'reject', note: 'Candidature non retenue apres evaluation.' })} className="rounded-md border px-3 py-2 font-bold">Rejeter</button></>}</div></td></tr>; })}{!applications.length && <tr><td colSpan={6} className="h-24 text-center text-slate-500">Aucune candidature fournisseur.</td></tr>}</tbody></table></div></section>
    {modal && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onMouseDown={() => setModal(null)}><form onSubmit={submit} onMouseDown={event => event.stopPropagation()} className="grid w-full max-w-2xl gap-4 rounded-lg bg-white p-6"><header className="flex justify-between"><h3 className="text-xl font-black">{modal === 'call' ? 'Nouvel appel fournisseur' : modal === 'visit' ? 'Planifier la descente terrain' : 'Rapport de visite terrain'}</h3><button type="button" onClick={() => setModal(null)}><X className="h-5 w-5" /></button></header>{modal === 'call' && <><Field label="Titre"><input name="title" className="admin-input" required /></Field><Field label="Categorie"><input name="category" className="admin-input" required /></Field><Field label="Zone de service"><input name="service_area" className="admin-input" /></Field><Field label="Date limite"><input name="closing_at" type="datetime-local" className="admin-input" /></Field><Field label="Exigences"><textarea name="requirements" className="admin-input min-h-24" required /></Field><Field label="Termes de reference"><textarea name="terms_of_reference" className="admin-input min-h-32" required /></Field></>}{modal === 'visit' && <><Field label="Date et heure"><input name="scheduled_at" type="datetime-local" className="admin-input" required /></Field><Field label="Lieu"><input name="location" className="admin-input" required /></Field><Field label="Inspecteurs"><textarea name="inspectors" className="admin-input" required /></Field><Field label="Checklist, un point par ligne"><textarea name="checklist" className="admin-input min-h-28" required /></Field></>}{modal === 'report' && <><Field label="Constats"><textarea name="findings" className="admin-input min-h-32" required /></Field><Field label="Score /100"><input name="score" type="number" min="0" max="100" className="admin-input" required /></Field><Field label="Recommandation"><select name="recommendation" className="admin-input"><option value="approve">Approuver</option><option value="reserve">Reserve</option><option value="reject">Rejeter</option></select></Field><Field label="Rapport terrain signe (PDF ou image)"><input name="report" type="file" accept=".pdf,.png,.jpg,.jpeg" className="admin-input" required /></Field></>}<button className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 font-bold text-white">Enregistrer</button></form></div>}
  </div>;
}

function Workflow({ call, action }: { call: Call; action: (status: string) => void }) { const next: Record<string, string[]> = { draft: ['submitted'], submitted: ['endorsed','rejected'], endorsed: ['validated','rejected'], validated: ['published'], published: ['closed'], rejected: ['draft'], closed: ['archived'] }; return <div className="flex justify-end gap-2">{(next[call.status] || []).map(status => <button key={status} onClick={() => action(status)} className="rounded-md border px-3 py-2 text-xs font-bold">{status}</button>)}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>; }
