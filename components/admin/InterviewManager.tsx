"use client";

import { FormEvent, useState } from "react";
import VideoRoom from "@/components/recruitment/VideoRoom";
import RecruitmentChat from "@/components/recruitment/RecruitmentChat";

type Row = Record<string, any>;
type InterviewQuestion = { prompt: string; assigned_email: string; private_notes: string };

const criteria = [
  ["technical_skill", "Competence technique"],
  ["communication", "Communication"],
  ["professional_ethics", "Ethique professionnelle"],
  ["clinical_experience", "Experience clinique"],
  ["teleconsultation_aptitude", "Aptitude au teleconseil"],
  ["availability", "Disponibilite"],
  ["motivation", "Motivation"],
] as const;

export default function InterviewManager({ applications, initial, adminId }: { applications: Row[]; initial: Row[]; adminId: string }) {
  const [interviews, setInterviews] = useState(initial);
  const [selected, setSelected] = useState<Row | null>(null);
  const [form, setForm] = useState({
    application_id: "",
    scheduled_at: "",
    duration_minutes: 45,
    jury_emails: "",
    participant_emails: "",
    admin_notes: "",
  });
  const [questions, setQuestions] = useState<InterviewQuestion[]>([{ prompt: "", assigned_email: "", private_notes: "" }]);
  const [message, setMessage] = useState("");

  async function schedule(e: FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/recruitment/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, questions }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message);
      return;
    }
    setInterviews([result.interview, ...interviews]);
    setMessage("Entretien planifie. Le candidat, les membres du jury et les participants invites ont recu le lien.");
    setQuestions([{ prompt: "", assigned_email: "", private_notes: "" }]);
  }

  async function evaluate(complete = false) {
    if (!selected) return;
    const evaluation = selected.interview_evaluations?.[0] || {};
    const response = await fetch("/api/recruitment/interview", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...evaluation, interview_id: selected.id, admin_notes: selected.admin_notes, complete }),
    });
    const result = await response.json();
    setMessage(response.ok ? "Evaluation enregistree." : result.message);
  }

  function setEvaluation(name: string, value: unknown) {
    const evaluation = { ...(selected?.interview_evaluations?.[0] || {}), [name]: value };
    setSelected({ ...selected, interview_evaluations: [evaluation] });
  }

  function updateQuestion(index: number, patch: Partial<InterviewQuestion>) {
    setQuestions(questions.map((question, i) => i === index ? { ...question, ...patch } : question));
  }

  const juryEmails = form.jury_emails.split(/[\n,;]+/).map(email => email.trim()).filter(Boolean);

  return <div>
    <form onSubmit={schedule} className="mb-8 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-4">
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Candidat
        <select required className="admin-input" value={form.application_id} onChange={e => setForm({ ...form, application_id: e.target.value })}>
          <option value="">Selectionner...</option>
          {applications.map(a => <option key={a.id} value={a.id}>{a.full_name} - {a.email}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">Date et heure
        <input required type="datetime-local" className="admin-input" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
      </label>
      <label className="grid gap-2 text-sm font-bold">Duree (minutes)
        <input type="number" className="admin-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
      </label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Membres du jury
        <textarea className="admin-input min-h-24" value={form.jury_emails} onChange={e => setForm({ ...form, jury_emails: e.target.value })} placeholder="emails separes par virgule ou retour a la ligne" />
      </label>
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Autres participants
        <textarea className="admin-input min-h-24" value={form.participant_emails} onChange={e => setForm({ ...form, participant_emails: e.target.value })} placeholder="observateurs, collaborateurs, experts externes..." />
      </label>
      <label className="grid gap-2 text-sm font-bold md:col-span-4">Note administrative de la reunion
        <textarea className="admin-input" value={form.admin_notes} onChange={e => setForm({ ...form, admin_notes: e.target.value })} placeholder="Objectif, contexte, consignes au jury..." />
      </label>

      <div className="rounded-2xl bg-slate-50 p-4 md:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Questions d'entretien privees</h3>
            <p className="text-sm text-slate-500">Visibles uniquement aux admins et aux membres du jury. Chaque question peut etre assignee a un membre du jury.</p>
          </div>
          <button type="button" onClick={() => setQuestions([...questions, { prompt: "", assigned_email: "", private_notes: "" }])} className="btn-secondary px-4 py-2">Ajouter une question</button>
        </div>
        <div className="mt-4 grid gap-3">{questions.map((question, index) => <div key={index} className="grid gap-3 rounded-xl bg-white p-4 md:grid-cols-[1fr_240px]">
          <textarea className="admin-input" value={question.prompt} onChange={e => updateQuestion(index, { prompt: e.target.value })} placeholder={`Question ${index + 1}`} />
          <select className="admin-input" value={question.assigned_email} onChange={e => updateQuestion(index, { assigned_email: e.target.value })}>
            <option value="">Jury non assigne</option>
            {juryEmails.map(email => <option key={email} value={email}>{email}</option>)}
          </select>
          <input className="admin-input md:col-span-2" value={question.private_notes} onChange={e => updateQuestion(index, { private_notes: e.target.value })} placeholder="Notes privees pour le jury" />
        </div>)}</div>
      </div>

      <button className="btn-primary justify-self-start md:col-span-4">Planifier et inviter</button>
    </form>

    {message && <p className="mb-5 rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <div className="grid gap-4">{interviews.map(i => <button key={i.id} onClick={() => setSelected(i)} className="rounded-2xl border bg-white p-5 text-left">
      <div className="flex flex-wrap justify-between gap-3"><div><b className="text-lg text-forest">{i.recruitment_applications?.full_name || "Candidat"}</b><p className="text-sm text-slate-500">{new Date(i.scheduled_at).toLocaleString("fr-FR")} - {i.duration_minutes} min</p><p className="mt-1 text-xs text-slate-400">{i.meeting_url}</p></div><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-leaf">{i.status}</span></div>
    </button>)}
    {!interviews.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucun entretien planifie.</p>}</div>

    {selected && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 p-3"><div className="mx-auto my-4 max-w-7xl rounded-3xl bg-slate-100 p-5">
      <div className="mb-5 flex justify-between"><div><h2 className="text-2xl font-black">Entretien de {selected.recruitment_applications?.full_name}</h2><p>{new Date(selected.scheduled_at).toLocaleString("fr-FR")}</p><button onClick={() => navigator.clipboard.writeText(selected.meeting_url || "")} className="mt-2 text-sm font-bold text-leaf">Copier le lien de reunion</button></div><button onClick={() => setSelected(null)} className="text-3xl">x</button></div>
      <VideoRoom roomName={selected.room_name} displayName="Equipe NutVitaGlobalis" />
      <div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-white p-6"><h3 className="text-xl font-black">Grille d'evaluation</h3><div className="mt-5 grid gap-4 sm:grid-cols-2">{criteria.map(([name, label]) => <label key={name} className="grid gap-2 text-sm font-bold">{label}<select className="admin-input" value={selected.interview_evaluations?.[0]?.[name] || ""} onChange={e => setEvaluation(name, Number(e.target.value))}><option value="">Non note</option>{[1, 2, 3, 4, 5].map(x => <option key={x}>{x}</option>)}</select></label>)}</div><label className="mt-4 grid gap-2 text-sm font-bold">Notes internes<textarea rows={4} className="admin-input" value={selected.admin_notes || ""} onChange={e => setSelected({ ...selected, admin_notes: e.target.value })} /></label><label className="mt-4 grid gap-2 text-sm font-bold">Recommandation<select className="admin-input" value={selected.interview_evaluations?.[0]?.recommendation || "pending"} onChange={e => setEvaluation("recommendation", e.target.value)}><option value="pending">A decider</option><option value="select">Recommander</option><option value="reject">Ne pas recommander</option></select></label><div className="mt-5 flex gap-3"><button onClick={() => evaluate(false)} className="btn-secondary">Enregistrer</button><button onClick={() => evaluate(true)} className="btn-primary">Terminer l'entretien</button></div></section><RecruitmentChat applicationId={selected.application_id} currentUserId={adminId} candidateId={selected.candidate_id} isAdmin /></div>
    </div></div>}
  </div>;
}
