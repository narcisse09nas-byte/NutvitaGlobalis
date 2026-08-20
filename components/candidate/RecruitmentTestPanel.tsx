"use client";
import { useState } from "react";
import WrittenTest from "@/components/candidate/WrittenTest";

type Attempt = { id: string; status: string; reviewer_comments: string | null } | null;
type Comment = { id: string; message: string; created_at: string };

const statusLabels: Record<string, string> = { in_progress: "En cours", submitted: "Soumis", expired: "Expiré", graded: "Corrigé" };

export default function RecruitmentTestPanel({ applicationTitle, candidateId, candidateName, applicationStatus, attempt, comments: initialComments }: {
  applicationTitle: string; candidateId: string; candidateName: string; applicationStatus: string; attempt: Attempt; comments: Comment[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const started = Boolean(attempt);
  const finished = attempt ? ["submitted", "expired", "graded"].includes(attempt.status) : false;
  const eligible = applicationStatus === "invited_to_test" && !finished;
  const canStart = eligible && !started;
  const canContinue = eligible && started && !finished;

  async function submitComment() {
    const value = draft.trim();
    if (!value || !attempt) return;
    setBusy(true);
    const response = await fetch("/api/candidate/test-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track: "recruitment", test_ref_id: attempt.id, message: value }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return;
    setComments(current => [{ id: result.item.id, message: value, created_at: result.item.created_at }, ...current]);
    setDraft("");
  }

  return <article className="grid gap-4 rounded-md border bg-white p-4">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-xs font-bold uppercase text-leaf">Dossier diététicien / promoteur</p>
        <h3 className="mt-1 font-black">{applicationTitle}</h3>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{attempt ? statusLabels[attempt.status] || attempt.status : eligible ? "Disponible" : "Non disponible"}</span>
        <button disabled={!canStart} onClick={() => setExpanded(true)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Passer le test</button>
        <button disabled={!canContinue} onClick={() => setExpanded(true)} className="rounded-md border px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">Poursuivre</button>
      </div>
    </div>

    <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-bold uppercase text-slate-400">Commentaires reçus de l&apos;administration</p>
        <div className="mt-2 grid gap-2">
          {attempt?.reviewer_comments ? <p className="rounded-md bg-slate-50 p-3 text-sm">{attempt.reviewer_comments}</p> : <p className="text-sm text-slate-400">Aucun commentaire pour le moment.</p>}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-slate-400">Mon commentaire</p>
        <div className="mt-2 grid gap-2">
          {comments.map(comment => <p key={comment.id} className="rounded-md bg-mint/50 p-3 text-sm">{comment.message}<span className="mt-1 block text-[11px] text-slate-400">{new Date(comment.created_at).toLocaleDateString("fr-FR")}</span></p>)}
          {attempt ? <div className="flex gap-2"><input className="admin-input flex-1" placeholder="Ajouter un commentaire..." value={draft} onChange={e => setDraft(e.target.value)} /><button disabled={busy} onClick={submitComment} className="rounded-md border px-4 py-2 text-sm font-bold disabled:opacity-50">Envoyer</button></div> : <p className="text-xs text-slate-400">Le commentaire sera disponible une fois le test commencé.</p>}
        </div>
      </div>
    </div>

    {expanded && <div className="border-t pt-5"><WrittenTest eligible={eligible} completed={finished} candidateId={candidateId} candidateName={candidateName} /></div>}
  </article>;
}
