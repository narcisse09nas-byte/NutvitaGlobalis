"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import VideoRoom from "@/components/recruitment/VideoRoom";

type Row = Record<string, any>;

export default function CallManager({ initial, currentUserId, conversations, clients = [], collaborators = [], canCreate = true, adminMode = false }: { initial: Row[]; currentUserId: string; conversations: Row[]; clients?: Row[]; collaborators?: Row[]; canCreate?: boolean; adminMode?: boolean }) {
  const [calls, setCalls] = useState(initial), [active, setActive] = useState<Row | null>(null), [message, setMessage] = useState("");
  const contacts = useMemo<Row[]>(() => [...clients.map((x: Row) => ({ ...x, role: "client" })), ...collaborators.map((x: Row) => ({ ...x, role: x.member_role || "collaborateur" }))], [clients, collaborators]);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form), targetType = String(fd.get("target_type") || "client");
    const memberIds = fd.getAll(targetType === "client" ? "client_ids" : "collaborator_ids").map(String).filter(Boolean);
    const room = `NutVita-${crypto.randomUUID().slice(0, 8)}`;
    const conversationId = String(fd.get("conversation_id") || "") || null;
    const payload = { title: String(fd.get("title")), conversation_id: conversationId, scheduled_at: fd.get("scheduled_at") ? new Date(String(fd.get("scheduled_at"))).toISOString() : new Date().toISOString(), duration_minutes: Number(fd.get("duration_minutes") || 45), provider: "jitsi", room_name: room, status: "scheduled", created_by: currentUserId };
    const supabase = createClient(), { data, error } = await supabase.from("collaboration_calls").insert(payload).select().single();
    if (error) {
      setMessage(error.message);
      return;
    }
    const members = Array.from(new Set([currentUserId, ...memberIds]));
    if (members.length) await supabase.from("collaboration_call_members").insert(members.map(user_id => ({ call_id: data.id, user_id, invited_by: currentUserId })));
    if (conversationId) {
      const { data: existingMembers } = await supabase.from("collaboration_members").select("user_id").eq("conversation_id", conversationId);
      const missing = (existingMembers || []).map((m: Row) => m.user_id).filter((id: string) => !members.includes(id));
      if (missing.length) await supabase.from("collaboration_call_members").insert(missing.map(user_id => ({ call_id: data.id, user_id, invited_by: currentUserId })));
    }
    setCalls([{ ...data, collaboration_call_members: members.map(user_id => ({ user_id })) }, ...calls]);
    form.reset();
    setMessage("Salle video creee.");
  }

  async function addParticipant(call: Row, userId: string) {
    if (!userId) return;
    const { error } = await createClient().from("collaboration_call_members").insert({ call_id: call.id, user_id: userId, invited_by: currentUserId });
    if (error) setMessage(error.message);
    else {
      const next = { ...call, collaboration_call_members: [...(call.collaboration_call_members || []), { user_id: userId }] };
      setActive(next);
      setCalls(calls.map(x => x.id === call.id ? next : x));
    }
  }

  return <div className="grid gap-6">{canCreate && <form onSubmit={create} className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2"><h2 className="text-xl font-black md:col-span-2">Planifier une reunion ou un appel</h2><label className="grid gap-2 text-sm font-bold">Titre<input name="title" required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Type d'appel<select name="target_type" className="admin-input"><option value="client">Avec client(s)</option><option value="collaborator">Avec collaborateur(s)</option></select></label><label className="grid gap-2 text-sm font-bold">Clients<select name="client_ids" multiple className="admin-input min-h-28">{clients.map(c => <option key={c.id} value={c.id}>{c.full_name} - {adminMode ? c.partner_assignment_status || "client" : "actif"}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Collaborateurs<select name="collaborator_ids" multiple className="admin-input min-h-28">{collaborators.map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.member_role || c.department || "collaborateur"}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Conversation associee<select name="conversation_id" className="admin-input"><option value="">Aucune</option>{conversations.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label className="grid gap-2 text-sm font-bold">Date<input name="scheduled_at" type="datetime-local" className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Duree<input name="duration_minutes" type="number" defaultValue="45" className="admin-input" /></label><button className="btn-primary justify-self-start md:col-span-2">Creer la salle</button>{message && <p className="text-sm text-leaf md:col-span-2">{message}</p>}</form>}<section className="grid gap-3">{calls.map(call => <article key={call.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><b>{call.title}</b><p className="mt-1 text-sm text-slate-500">{call.scheduled_at ? new Date(call.scheduled_at).toLocaleString("fr-FR") : "Immediat"} - {call.duration_minutes} min</p><p className="mt-1 text-xs text-slate-400">{(call.collaboration_call_members || []).length} participant(s)</p></div><button onClick={() => setActive(call)} className="btn-primary px-5 py-2">Rejoindre</button></div></article>)}{!calls.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucun appel planifie.</p>}</section>{active && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 p-4"><div className="mx-auto max-w-6xl"><div className="mb-3 flex justify-between text-white"><h2 className="text-xl font-black text-white">{active.title}</h2><button onClick={() => setActive(null)} className="font-bold">Fermer</button></div><div className="mb-3 grid gap-3 rounded-2xl bg-white p-4 md:grid-cols-[1fr_260px]"><div><h3 className="font-black">Participants</h3><div className="mt-2 flex flex-wrap gap-2">{(active.collaboration_call_members || []).map((m: Row) => <span key={m.user_id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{contacts.find(c => c.id === m.user_id)?.full_name || (m.user_id === currentUserId ? "Moi" : m.user_id.slice(0, 8))}</span>)}</div></div><label className="grid gap-2 text-sm font-bold">Ajouter pendant la reunion<select onChange={e => addParticipant(active, e.target.value)} className="admin-input"><option value="">Ajouter...</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.role}</option>)}</select></label></div><VideoRoom roomName={active.room_name} displayName="NutVitaGlobalis" /></div></div>}</div>;
}
