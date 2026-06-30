'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Archive, CheckCircle2, Edit, Eye, FileCheck2, Plus, Send, Trash2, X, XCircle } from 'lucide-react';

type Question = {
  id?: string; question_type: 'single_choice' | 'multiple_choice' | 'open' | 'file_upload';
  prompt: string; help_text?: string; options: string[]; correct_answers: string[]; required: boolean;
  points: number; max_words?: number | null; max_file_size_mb?: number | null;
};
type Assignment = {
  id: string; status: string; automatic_score?: number; final_score?: number; answers?: Record<string, unknown>;
  maximus_staff_applications?: { id: string; full_name: string; email: string };
  maximus_test_reviews?: Array<{ id: string; reviewer_email: string; status: string; score?: number; comments?: string }>;
};
type Test = {
  id: string; offer_id: string; title: string; instructions?: string; duration_minutes: number; pass_score: number;
  proctoring_mode: 'none' | 'activity' | 'live'; require_camera: boolean; require_screen_share: boolean;
  track_tab_switches: boolean; track_disconnects: boolean; track_audio_activity: boolean; track_face_presence: boolean;
  proctoring_consent_text?: string;
  status: 'draft' | 'submitted' | 'endorsed' | 'validated' | 'rejected' | 'archived'; created_at: string;
  questions: Question[]; assignments: Assignment[]; maximus_job_offers?: { id: string; reference: string; title: string };
};
type Offer = { id: string; reference: string; title: string; status: string };

const labels = { draft: 'Brouillon', submitted: 'Soumise', endorsed: 'Endossee', validated: 'Validee', rejected: 'Rejetee', archived: 'Archivee' };
const blankQuestion = (): Question => ({ question_type: 'single_choice', prompt: '', options: ['', ''], correct_answers: [], required: true, points: 1 });

export default function WrittenTestDesigner() {
  const [tests, setTests] = useState<Test[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([blankQuestion()]);
  const [proctorMode, setProctorMode] = useState<'none' | 'activity' | 'live'>('activity');
  const [viewing, setViewing] = useState<Test | null>(null);
  const [copy, setCopy] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/recruitment/tests');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Impossible de charger les epreuves.');
    setTests(payload.items || []);
    setOffers(payload.offers || []);
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Chargement impossible.')); }, []);

  function openForm(test?: Test) {
    setEditing(test || null);
    setQuestions(test?.questions?.length ? test.questions.map(item => ({ ...item, options: [...(item.options || [])], correct_answers: [...(item.correct_answers || [])] })) : [blankQuestion()]);
    setProctorMode(test?.proctoring_mode || 'activity');
    setError('');
    setFormOpen(true);
  }
  function updateQuestion(index: number, changes: Partial<Question>) {
    setQuestions(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy('save');
    const response = await fetch('/api/maximus/recruitment/tests', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(editing ? { id: editing.id } : {}),
        offer_id: values.get('offer_id'),
        title: values.get('title'),
        instructions: values.get('instructions'),
        duration_minutes: values.get('duration_minutes'),
        pass_score: values.get('pass_score'),
        proctoring_mode: proctorMode,
        require_camera: values.get('require_camera') === 'on',
        require_screen_share: values.get('require_screen_share') === 'on',
        track_tab_switches: values.get('track_tab_switches') === 'on',
        track_disconnects: values.get('track_disconnects') === 'on',
        track_audio_activity: values.get('track_audio_activity') === 'on',
        track_face_presence: values.get('track_face_presence') === 'on',
        proctoring_consent_text: values.get('proctoring_consent_text'),
        questions,
      }),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Enregistrement impossible.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Epreuve mise a jour.' : 'Epreuve creee en brouillon.');
    await load();
  }
  async function transition(test: Test, status: string) {
    const note = status === 'rejected' ? window.prompt('Motif du rejet :')?.trim() : '';
    if (status === 'rejected' && !note) return;
    setBusy(test.id);
    const response = await fetch('/api/maximus/recruitment/tests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: test.id, action: 'transition', status, note }) });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Transition impossible.');
    setMessage(`Epreuve ${labels[status as keyof typeof labels]?.toLowerCase() || status}.`);
    setViewing(null);
    await load();
  }
  async function remove(test: Test) {
    if (!confirm(`Supprimer "${test.title}" ?`)) return;
    const response = await fetch(`/api/maximus/recruitment/tests?id=${test.id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) return setError(payload.message || 'Suppression impossible.');
    await load();
  }
  async function assignReviewers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!copy || !viewing) return;
    const emails = String(new FormData(event.currentTarget).get('emails') || '').split(/[\n,;]+/).map(value => value.trim()).filter(Boolean);
    setBusy(copy.id);
    const response = await fetch('/api/maximus/recruitment/tests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: viewing.id, action: 'assign_reviewers', assignment_id: copy.id, reviewer_emails: emails }) });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Invitation impossible.');
    setMessage('Correcteurs invites par email.');
    setCopy(null);
    setViewing(null);
    await load();
  }
  async function submitReview(event: FormEvent<HTMLFormElement>, reviewId: string) {
    event.preventDefault();
    if (!viewing) return;
    const values = new FormData(event.currentTarget);
    setBusy(reviewId);
    const response = await fetch('/api/maximus/recruitment/tests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: viewing.id, action: 'submit_review', review_id: reviewId, score: values.get('score'), comments: values.get('comments') }) });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setError(payload.message || 'Correction impossible.');
    setMessage(`Correction enregistree. Moyenne actuelle : ${payload.final_score ?? 'N/A'}%.`);
    setCopy(null);
    setViewing(null);
    await load();
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-black">Tests ecrits</h2><p className="mt-1 text-sm text-slate-500">Conception, approbation, attribution et correction des epreuves Staff.</p></div><button onClick={() => openForm()} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Nouvelle epreuve</button></div>
    {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{message}</p>}
    {error && <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
    <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Registre des epreuves</h3><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Epreuve</th><th className="p-3">Offre</th><th className="p-3">Questions</th><th className="p-3">Duree</th><th className="p-3">Passage</th><th className="p-3">Copies</th><th className="p-3">Statut</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{tests.length ? tests.map(test => <tr key={test.id} className="border-b"><td className="p-3 font-semibold">{test.title}</td><td className="p-3">{test.maximus_job_offers?.title || offers.find(offer => offer.id === test.offer_id)?.title}</td><td className="p-3">{test.questions.length}</td><td className="p-3">{test.duration_minutes} min</td><td className="p-3">{test.pass_score}%</td><td className="p-3">{test.assignments.length}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{labels[test.status]}</span></td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setViewing(test)} className="rounded-md border p-2" title="Consulter"><Eye className="h-4 w-4" /></button>{['draft','rejected'].includes(test.status) && <button onClick={() => openForm(test)} className="rounded-md border p-2" title="Modifier"><Edit className="h-4 w-4" /></button>}<Workflow test={test} busy={busy === test.id} transition={transition} />{['draft','rejected'].includes(test.status) && <button onClick={() => remove(test)} className="rounded-md bg-red-600 p-2 text-white" title="Supprimer"><Trash2 className="h-4 w-4" /></button>}</div></td></tr>) : <tr><td colSpan={8} className="h-32 text-center text-slate-500">Aucune epreuve creee.</td></tr>}</tbody></table></div></section>

    {formOpen && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="mx-auto my-6 w-full max-w-5xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">{editing ? 'Modifier l epreuve' : 'Composer une epreuve'}</h3><p className="mt-1 text-sm text-slate-500">Configurez chaque question selon le type de reponse attendu.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header><form onSubmit={save} className="grid gap-6 p-6"><div className="grid gap-5 md:grid-cols-2"><Field label="Offre"><select className="admin-input" name="offer_id" defaultValue={editing?.offer_id || ''} disabled={Boolean(editing)} required><option value="">Selectionner</option>{offers.map(offer => <option key={offer.id} value={offer.id}>{offer.reference} - {offer.title}</option>)}</select></Field><Field label="Titre"><input className="admin-input" name="title" defaultValue={editing?.title || ''} required /></Field><Field label="Duree (minutes)"><input className="admin-input" name="duration_minutes" type="number" min="5" max="480" defaultValue={editing?.duration_minutes || 60} required /></Field><Field label="Note de passage (%)"><input className="admin-input" name="pass_score" type="number" min="0" max="100" defaultValue={editing?.pass_score || 50} required /></Field></div><Field label="Instructions"><textarea className="admin-input min-h-24" name="instructions" defaultValue={editing?.instructions || ''} /></Field>
      <section className="grid gap-4 rounded-md border bg-slate-50 p-5">
        <div><h4 className="text-lg font-black">Surveillance de l epreuve</h4><p className="mt-1 text-sm text-slate-500">Les signaux collectes assistent le surveillant et ne prennent jamais une decision automatique.</p></div>
        <Field label="Mode de surveillance"><select className="admin-input" value={proctorMode} onChange={event => setProctorMode(event.target.value as typeof proctorMode)}><option value="activity">Journal comportemental uniquement - recommande</option><option value="live">Camera et ecran - finalistes ou tests sensibles</option><option value="none">Aucune surveillance</option></select></Field>
        {proctorMode === 'live' && <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-900">Pour limiter les couts et la bande passante, organisez les sessions video par groupes de cinq candidats maximum.</p>}
        {proctorMode !== 'none' && <div className="grid gap-3 md:grid-cols-2">
          {proctorMode === 'live' && <><Check name="require_camera" label="Camera obligatoire" defaultChecked={editing?.require_camera ?? true} /><Check name="require_screen_share" label="Partage d ecran obligatoire" defaultChecked={editing?.require_screen_share ?? true} /></>}
          <Check name="track_tab_switches" label="Journaliser les sorties d onglet" defaultChecked={editing?.track_tab_switches ?? true} />
          <Check name="track_disconnects" label="Journaliser les deconnexions" defaultChecked={editing?.track_disconnects ?? true} />
          <Check name="track_audio_activity" label="Compter les episodes de voix/bruit si supporte" defaultChecked={editing?.track_audio_activity ?? false} />
          <Check name="track_face_presence" label="Evaluer la presence du visage si supporte" defaultChecked={editing?.track_face_presence ?? false} />
        </div>}
        {proctorMode !== 'none' && <Field label="Texte de consentement"><textarea className="admin-input min-h-24" name="proctoring_consent_text" defaultValue={editing?.proctoring_consent_text || 'Je consens a la surveillance de cette epreuve, a la collecte des evenements de connexion et de navigation, et, si requis, a la transmission temporaire de ma camera, de mon microphone et de mon ecran au surveillant autorise.'} required /></Field>}
      </section>
      <div className="grid gap-4"><div className="flex items-center justify-between"><h4 className="text-lg font-black">Questions</h4><button type="button" onClick={() => setQuestions(current => [...current, blankQuestion()])} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" />Ajouter</button></div>{questions.map((question, index) => <QuestionEditor key={index} question={question} index={index} update={changes => updateQuestion(index, changes)} remove={() => setQuestions(current => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>
      <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="rounded-md border px-5 py-3 font-bold">Annuler</button><button disabled={busy === 'save' || !questions.length} className="rounded-md bg-[#24945f] px-5 py-3 font-bold text-white disabled:opacity-40">{busy === 'save' ? 'Enregistrement...' : 'Enregistrer le brouillon'}</button></div></form></section></div>}

    {viewing && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="mx-auto my-6 w-full max-w-5xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">{viewing.title}</h3><p className="mt-1 text-sm text-slate-500">{viewing.maximus_job_offers?.title} · {labels[viewing.status]}</p></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-7 p-6"><section><h4 className="font-black">Questions</h4><div className="mt-3 grid gap-3">{viewing.questions.map((question, index) => <div key={question.id || index} className="rounded-md border p-4"><p className="text-xs font-bold uppercase text-slate-400">{index + 1}. {question.question_type} · {question.points} point(s)</p><p className="mt-2 font-semibold">{question.prompt}</p></div>)}</div></section><section><h4 className="font-black">Copies et corrections</h4><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Candidat</th><th className="p-3">Statut</th><th className="p-3">Auto</th><th className="p-3">Final</th><th className="p-3">Correcteurs</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{viewing.assignments.length ? viewing.assignments.map(item => <tr key={item.id} className="border-b"><td className="p-3 font-semibold">{item.maximus_staff_applications?.full_name}</td><td className="p-3">{item.status}</td><td className="p-3">{item.automatic_score ?? 'N/A'}</td><td className="p-3">{item.final_score ?? 'N/A'}</td><td className="p-3">{item.maximus_test_reviews?.length || 0}</td><td className="p-3 text-right"><button onClick={() => setCopy(item)} className="rounded-md border px-3 py-2 font-bold">Ouvrir la copie</button></td></tr>) : <tr><td colSpan={6} className="h-24 text-center text-slate-500">Aucune copie affectee.</td></tr>}</tbody></table></div></section><div className="flex flex-wrap justify-end gap-2 border-t pt-5"><Workflow test={viewing} busy={busy === viewing.id} transition={transition} /><button onClick={() => setViewing(null)} className="rounded-md border px-4 py-2 font-bold">Fermer</button></div></div></section></div>}

    {copy && viewing && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/65 p-4" onMouseDown={() => setCopy(null)}><section className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-xl font-black">Copie de {copy.maximus_staff_applications?.full_name}</h3><p className="mt-1 text-sm text-slate-500">Note automatique : {copy.automatic_score ?? 'N/A'}%</p></div><button onClick={() => setCopy(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6"><div className="grid gap-4">{viewing.questions.map((question, index) => <div key={question.id || index} className="rounded-md border p-4"><p className="font-bold">{index + 1}. {question.prompt}</p><pre className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{formatAnswer(copy.answers?.[question.id || ''])}</pre></div>)}</div><form onSubmit={assignReviewers} className="grid gap-3 rounded-md border p-4"><h4 className="font-black">Inviter des correcteurs</h4><textarea name="emails" className="admin-input min-h-20" placeholder="email1@exemple.com, email2@exemple.com" required /><button disabled={busy === copy.id} className="justify-self-end rounded-md bg-[#24945f] px-4 py-2 font-bold text-white">Envoyer les invitations</button></form>{(copy.maximus_test_reviews || []).map(review => <form key={review.id} onSubmit={event => submitReview(event, review.id)} className="grid gap-3 rounded-md bg-slate-50 p-4"><p className="font-bold">{review.reviewer_email} · {review.status}</p><div className="grid gap-3 sm:grid-cols-[140px_1fr]"><input name="score" className="admin-input" type="number" min="0" max="100" defaultValue={review.score} placeholder="Note / 100" required /><textarea name="comments" className="admin-input" defaultValue={review.comments} placeholder="Commentaires de correction" /></div><button disabled={busy === review.id} className="justify-self-end rounded-md border bg-white px-4 py-2 font-bold">Soumettre la correction</button></form>)}</div></section></div>}
  </div>;
}

function QuestionEditor({ question, index, update, remove }: { question: Question; index: number; update: (changes: Partial<Question>) => void; remove: () => void }) {
  return <section className="rounded-md border bg-slate-50 p-5"><div className="flex items-center justify-between"><h5 className="font-black">Question {index + 1}</h5><button type="button" onClick={remove} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Type"><select className="admin-input" value={question.question_type} onChange={event => update({ question_type: event.target.value as Question['question_type'], options: ['single_choice','multiple_choice'].includes(event.target.value) ? question.options.length ? question.options : ['', ''] : [], correct_answers: [] })}><option value="single_choice">QCM - choix unique</option><option value="multiple_choice">QCM - choix multiples</option><option value="open">Reponse ouverte</option><option value="file_upload">Document a joindre</option></select></Field><Field label="Points"><input className="admin-input" type="number" min="0" step="0.5" value={question.points} onChange={event => update({ points: Number(event.target.value) })} /></Field></div><div className="mt-4"><Field label="Enonce"><textarea className="admin-input min-h-20" value={question.prompt} onChange={event => update({ prompt: event.target.value })} /></Field></div>
    {['single_choice','multiple_choice'].includes(question.question_type) && <div className="mt-4 grid gap-3"><p className="text-sm font-bold">Choix et bonnes reponses</p>{question.options.map((option, optionIndex) => <div key={optionIndex} className="flex items-center gap-3"><input type={question.question_type === 'single_choice' ? 'radio' : 'checkbox'} name={`correct-${index}`} checked={question.correct_answers.includes(option) && Boolean(option)} onChange={event => { const others = question.correct_answers.filter(value => value !== option); update({ correct_answers: event.target.checked ? question.question_type === 'single_choice' ? [option] : [...others, option] : others }); }} /><input className="admin-input flex-1" value={option} onChange={event => { const old = option; const options = question.options.map((value, i) => i === optionIndex ? event.target.value : value); update({ options, correct_answers: question.correct_answers.map(value => value === old ? event.target.value : value) }); }} placeholder={`Choix ${optionIndex + 1}`} /><button type="button" onClick={() => update({ options: question.options.filter((_, i) => i !== optionIndex), correct_answers: question.correct_answers.filter(value => value !== option) })} className="text-red-600"><X className="h-4 w-4" /></button></div>)}<button type="button" onClick={() => update({ options: [...question.options, ''] })} className="justify-self-start text-sm font-bold text-leaf">+ Ajouter un choix</button></div>}
    {question.question_type === 'open' && <div className="mt-4"><Field label="Nombre maximal de mots"><input className="admin-input" type="number" min="0" value={question.max_words || ''} onChange={event => update({ max_words: Number(event.target.value) || null })} /></Field></div>}
    {question.question_type === 'file_upload' && <div className="mt-4"><Field label="Taille maximale du fichier (Mo)"><input className="admin-input" type="number" min="1" max="15" value={question.max_file_size_mb || 10} onChange={event => update({ max_file_size_mb: Number(event.target.value) })} /></Field></div>}
    <label className="mt-4 flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={question.required} onChange={event => update({ required: event.target.checked })} />Question obligatoire</label></section>;
}

function Workflow({ test, busy, transition }: { test: Test; busy: boolean; transition: (test: Test, status: string) => void }) {
  if (busy) return null;
  if (test.status === 'draft') return <IconButton title="Soumettre" icon={Send} onClick={() => transition(test, 'submitted')} />;
  if (test.status === 'submitted') return <><IconButton title="Endosser" icon={FileCheck2} onClick={() => transition(test, 'endorsed')} /><IconButton title="Rejeter" icon={XCircle} danger onClick={() => transition(test, 'rejected')} /></>;
  if (test.status === 'endorsed') return <><IconButton title="Valider" icon={CheckCircle2} onClick={() => transition(test, 'validated')} /><IconButton title="Rejeter" icon={XCircle} danger onClick={() => transition(test, 'rejected')} /></>;
  if (test.status === 'rejected') return <IconButton title="Remettre en brouillon" icon={Edit} onClick={() => transition(test, 'draft')} />;
  if (test.status === 'validated') return <IconButton title="Archiver" icon={Archive} onClick={() => transition(test, 'archived')} />;
  return null;
}
function IconButton({ title, icon: Icon, onClick, danger = false }: { title: string; icon: typeof Send; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} title={title} className={`rounded-md p-2 ${danger ? 'bg-red-600 text-white' : 'border'}`}><Icon className="h-4 w-4" /></button>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>; }
function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) { return <label className="flex items-center gap-3 rounded-md border bg-white p-3 text-sm font-bold"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />{label}</label>; }
function formatAnswer(value: unknown) { return value === undefined ? 'Aucune reponse' : typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
