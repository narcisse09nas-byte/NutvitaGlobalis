'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Clock3, FileUp, Play, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import JitsiProctorSession from './JitsiProctorSession';
import ExamActivityMonitor from './ExamActivityMonitor';

type Question = {
  id: string;
  question_type: 'single_choice' | 'multiple_choice' | 'open' | 'file_upload';
  prompt: string;
  help_text?: string;
  options?: string[];
  required: boolean;
  points: number;
  max_words?: number | null;
  allowed_mime_types?: string[] | null;
  max_file_size_mb?: number | null;
};

type Assignment = {
  id: string;
  status: string;
  expires_at?: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
  answers?: Record<string, unknown> | null;
  proctor_room?: string | null;
  proctoring_consent_at?: string | null;
  automatic_score?: number | null;
  final_score?: number | null;
  maximus_written_tests?: {
    id: string;
    title: string;
    instructions?: string;
    duration_minutes: number;
    pass_score: number;
    proctoring_mode: 'none' | 'activity' | 'live';
    require_camera: boolean;
    require_screen_share: boolean;
    track_tab_switches: boolean;
    track_disconnects: boolean;
    track_audio_activity: boolean;
    track_face_presence: boolean;
    proctoring_consent_text?: string | null;
    maximus_test_questions: Question[];
  } | null;
  maximus_staff_applications?: {
    maximus_job_offers?: { title: string; reference: string } | null;
  } | null;
};

const statusLabels: Record<string, string> = {
  sent: 'Disponible',
  opened: 'Disponible',
  in_progress: 'En cours',
  submitted: 'Soumise',
  graded: 'Corrigee',
  expired: 'Expiree',
};

export default function CandidateWrittenTests() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [preflight, setPreflight] = useState<Assignment | null>(null);
  const [consent, setConsent] = useState(false);
  const [readiness, setReadiness] = useState({ joined: false, camera: false, screen: false });
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/staff-candidate/tests', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Impossible de charger vos epreuves.');
    setItems(payload.items || []);
    setActive(current => current ? (payload.items || []).find((item: Assignment) => item.id === current.id) || null : null);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Chargement impossible.'));
  }, []);

  useEffect(() => {
    if (active?.status !== 'in_progress') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active?.status]);

  const secondsLeft = useMemo(() => {
    if (!active?.expires_at) return null;
    return Math.max(0, Math.floor((new Date(active.expires_at).getTime() - now) / 1000));
  }, [active?.expires_at, now]);

  async function start(item: Assignment) {
    if (item.maximus_written_tests?.proctoring_mode !== 'none') {
      setConsent(false);
      setReadiness({ joined: false, camera: false, screen: false });
      setPreflight(item);
      return;
    }
    if (!window.confirm('Le chronometre demarrera immediatement. Commencer cette epreuve ?')) return;
    await begin(item, { joined: true, camera: true, screen: true });
  }

  async function begin(item: Assignment, ready: { joined: boolean; camera: boolean; screen: boolean }) {
    setBusy(item.id);
    setMessage('');
    const response = await fetch('/api/staff-candidate/tests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, action: 'start', proctoring_consent: consent || item.maximus_written_tests?.proctoring_mode === 'none', camera_ready: ready.camera, screen_ready: ready.screen }),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setMessage(payload.message || 'Demarrage impossible.');
    await load();
    const started = { ...item, ...payload.item };
    setPreflight(null);
    setActive(started);
    setNow(Date.now());
  }

  function toggle(questionId: string, option: string, checked: boolean) {
    const current = Array.isArray(answers[questionId]) ? answers[questionId] as string[] : [];
    setAnswers({ ...answers, [questionId]: checked ? [...current, option] : current.filter(value => value !== option) });
  }

  async function upload(question: Question, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !active) return;
    const maximum = Number(question.max_file_size_mb || 10) * 1024 * 1024;
    if (file.size > maximum) return setMessage(`Le fichier depasse la limite de ${question.max_file_size_mb || 10} Mo.`);
    setBusy(question.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setBusy('');
    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
    const path = `${user.id}/tests/${active.id}/${question.id}-${Date.now()}-${safeName}`;
    const result = await supabase.storage.from('maximus-recruitment').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
    });
    setBusy('');
    if (result.error) return setMessage(result.error.message);
    setAnswers(current => ({ ...current, [question.id]: { path, name: file.name, type: file.type, size: file.size } }));
  }

  async function submit() {
    if (!active || !window.confirm('Soumettre definitivement vos reponses ? Elles ne pourront plus etre modifiees.')) return;
    setBusy(active.id);
    setMessage('');
    const response = await fetch('/api/staff-candidate/tests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: active.id, action: 'submit', answers }),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setMessage(payload.message || 'Soumission impossible.');
    setMessage('Votre copie a ete soumise. Vous serez notifie apres correction.');
    setAnswers({});
    setActive(null);
    await load();
  }

  if (!items.length) return null;

  return <section className="rounded-lg border bg-white p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-black">Mes tests ecrits</h2>
        <p className="mt-1 text-sm text-slate-500">Epreuves transmises par l equipe de recrutement Staff.</p>
      </div>
      {active?.status === 'in_progress' && <span className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-black ${secondsLeft !== null && secondsLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-mint text-forest'}`}>
        <Clock3 className="h-4 w-4" />{formatDuration(secondsLeft)}
      </span>}
    </div>
    {message && <p className="mt-4 rounded-md border bg-slate-50 p-3 text-sm font-semibold">{message}</p>}
    <div className="mt-5 grid gap-3">
      {items.map(item => <article key={item.id} className="flex flex-col justify-between gap-4 rounded-md border p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-leaf">{item.maximus_staff_applications?.maximus_job_offers?.reference} · {item.maximus_staff_applications?.maximus_job_offers?.title}</p>
          <h3 className="mt-1 font-black">{item.maximus_written_tests?.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{item.maximus_written_tests?.duration_minutes} minutes · Note de passage {item.maximus_written_tests?.pass_score}%</p>
          {item.final_score !== null && item.final_score !== undefined && <p className="mt-2 text-sm font-black text-forest">Note finale : {item.final_score}/100</p>}
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabels[item.status] || item.status}</span>
          {['sent', 'opened'].includes(item.status) && <button disabled={busy === item.id} onClick={() => start(item)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Play className="h-4 w-4" />Commencer</button>}
          {item.status === 'in_progress' && <button onClick={() => { setActive(item); setAnswers(item.answers || {}); }} className="rounded-md border px-4 py-2 text-sm font-bold">Continuer</button>}
        </div>
      </article>)}
    </div>

    {active?.status === 'in_progress' && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-4">
      <section className="mx-auto my-4 w-full max-w-4xl rounded-lg bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b bg-white p-6">
          <div><p className="text-xs font-bold uppercase text-orange">Epreuve en cours</p><h2 className="text-2xl font-black">{active.maximus_written_tests?.title}</h2></div>
          <span className={`inline-flex items-center gap-2 rounded-md px-3 py-2 font-black ${secondsLeft !== null && secondsLeft < 300 ? 'bg-red-100 text-red-700' : 'bg-mint text-forest'}`}><Clock3 className="h-4 w-4" />{formatDuration(secondsLeft)}</span>
        </header>
        <div className="grid gap-6 p-6">
          {active.maximus_written_tests?.proctoring_mode === 'activity' && <ExamActivityMonitor assignmentId={active.id} trackTabs={active.maximus_written_tests.track_tab_switches} trackDisconnects={active.maximus_written_tests.track_disconnects} />}
          {active.maximus_written_tests?.proctoring_mode === 'live' && active.proctor_room && <JitsiProctorSession assignmentId={active.id} roomName={active.proctor_room} candidateName={active.maximus_staff_applications?.maximus_job_offers?.reference || 'Candidat Staff'} requireCamera={active.maximus_written_tests.require_camera} requireScreen={active.maximus_written_tests.require_screen_share} trackTabs={active.maximus_written_tests.track_tab_switches} trackDisconnects={active.maximus_written_tests.track_disconnects} trackAudio={active.maximus_written_tests.track_audio_activity} active onReadiness={setReadiness} />}
          {active.maximus_written_tests?.instructions && <p className="rounded-md bg-slate-50 p-4 text-sm leading-6">{active.maximus_written_tests.instructions}</p>}
          {active.maximus_written_tests?.maximus_test_questions.map((question, index) => <QuestionField key={question.id} question={question} index={index} value={answers[question.id]} setValue={value => setAnswers(current => ({ ...current, [question.id]: value }))} toggle={toggle} upload={upload} busy={busy === question.id} />)}
          <div className="flex justify-end border-t pt-5"><button disabled={busy === active.id || secondsLeft === 0} onClick={submit} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />Soumettre ma copie</button></div>
        </div>
      </section>
    </div>}
    {preflight && <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/75 p-4">
      <section className="mx-auto my-4 w-full max-w-4xl rounded-lg bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black">Controle avant l epreuve</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{preflight.maximus_written_tests?.proctoring_consent_text || 'Cette epreuve collecte des evenements de surveillance afin de proteger l integrite du processus.'}</p>
        <label className="mt-5 flex gap-3 rounded-md border p-4 font-semibold"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5" /><span>J ai lu ces informations et je consens explicitement a cette surveillance pendant l epreuve.</span></label>
        {preflight.maximus_written_tests?.proctoring_mode === 'live' && <div className="mt-5"><JitsiProctorSession assignmentId={preflight.id} roomName={preflight.proctor_room || `NVG-PROCTOR-${preflight.id.replaceAll('-', '').slice(0, 18).toUpperCase()}`} candidateName={preflight.maximus_staff_applications?.maximus_job_offers?.reference || 'Candidat Staff'} requireCamera={preflight.maximus_written_tests.require_camera} requireScreen={preflight.maximus_written_tests.require_screen_share} trackTabs={preflight.maximus_written_tests.track_tab_switches} trackDisconnects={preflight.maximus_written_tests.track_disconnects} trackAudio={preflight.maximus_written_tests.track_audio_activity} active={false} onReadiness={setReadiness} /></div>}
        <div className="mt-6 flex justify-end gap-3 border-t pt-5"><button onClick={() => setPreflight(null)} className="rounded-md border px-4 py-2 font-bold">Annuler</button><button disabled={!consent || busy === preflight.id || (preflight.maximus_written_tests?.proctoring_mode === 'live' && (!readiness.joined || (preflight.maximus_written_tests.require_camera && !readiness.camera) || (preflight.maximus_written_tests.require_screen_share && !readiness.screen)))} onClick={() => begin(preflight, readiness)} className="rounded-md bg-[#24945f] px-5 py-3 font-bold text-white disabled:opacity-40">Demarrer le chronometre</button></div>
      </section>
    </div>}
  </section>;
}

function QuestionField({ question, index, value, setValue, toggle, upload, busy }: {
  question: Question;
  index: number;
  value: unknown;
  setValue: (value: unknown) => void;
  toggle: (questionId: string, option: string, checked: boolean) => void;
  upload: (question: Question, event: ChangeEvent<HTMLInputElement>) => void;
  busy: boolean;
}) {
  const uploadedName = value && typeof value === 'object' && 'name' in value
    ? String((value as { name: unknown }).name)
    : '';
  return <fieldset className="rounded-md border p-5">
    <legend className="px-2 text-sm font-black">Question {index + 1} · {question.points} point(s){question.required ? ' · Obligatoire' : ''}</legend>
    <p className="font-semibold leading-7">{question.prompt}</p>
    {question.help_text && <p className="mt-1 text-sm text-slate-500">{question.help_text}</p>}
    {question.question_type === 'single_choice' && <div className="mt-4 grid gap-2">{(question.options || []).map(option => <label key={option} className="flex gap-3 rounded-md border p-3"><input type="radio" name={question.id} checked={value === option} onChange={() => setValue(option)} /><span>{option}</span></label>)}</div>}
    {question.question_type === 'multiple_choice' && <div className="mt-4 grid gap-2">{(question.options || []).map(option => <label key={option} className="flex gap-3 rounded-md border p-3"><input type="checkbox" checked={Array.isArray(value) && value.includes(option)} onChange={event => toggle(question.id, option, event.target.checked)} /><span>{option}</span></label>)}</div>}
    {question.question_type === 'open' && <div className="mt-4"><textarea className="admin-input min-h-40" value={String(value || '')} onChange={event => setValue(event.target.value)} /><p className="mt-1 text-right text-xs text-slate-400">{wordCount(String(value || ''))}{question.max_words ? ` / ${question.max_words}` : ''} mots</p></div>}
    {question.question_type === 'file_upload' && <div className="mt-4 rounded-md border border-dashed p-4"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-bold"><FileUp className="h-4 w-4" />{busy ? 'Televersement...' : 'Joindre le document'}<input className="hidden" type="file" disabled={busy} accept={(question.allowed_mime_types || []).join(',') || undefined} onClick={() => { window.__maximusFilePickerUntil = Date.now() + 120000; }} onChange={event => { window.__maximusFilePickerUntil = Date.now() + 3000; upload(question, event); }} /></label>{uploadedName && <p className="mt-3 text-sm font-semibold text-forest">{uploadedName}</p>}<p className="mt-2 text-xs text-slate-400">Maximum {question.max_file_size_mb || 10} Mo.</p></div>}
  </fieldset>;
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
