"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, Clock, Copy, ExternalLink, MapPin, Plus, Search, UserPlus, Users, Video, X } from "lucide-react";
import VideoRoom from "@/components/recruitment/VideoRoom";

type Row = Record<string, any>;
type ExternalParticipant = { full_name: string; email: string; role: string };

export default function MaximusMeetingCenter() {
  const [meetings, setMeetings] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [jitsiDomain, setJitsiDomain] = useState("meet.jit.si");
  const [canCreate, setCanCreate] = useState(false);
  const [modal, setModal] = useState<"create" | "room" | "minutes" | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [external, setExternal] = useState<ExternalParticipant[]>([]);
  const [provider, setProvider] = useState("jitsi");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/maximus/meetings");
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.message || "Chargement impossible.");
    setMeetings(body.meetings || []);
    setUsers(body.users || []);
    setCurrentUserId(body.current_user_id || "");
    setCanCreate(Boolean(body.can_create));
    setJitsiDomain(body.jitsi_domain || "meet.jit.si");
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => meetings.filter(item =>
    (status === "all" || item.status === status)
    && (!search || `${item.title} ${item.reference} ${item.agenda || ""}`.toLowerCase().includes(search.toLowerCase()))
  ), [meetings, search, status]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const form = event.currentTarget, values = new FormData(form);
    const response = await fetch("/api/maximus/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.get("title"),
        meeting_type: values.get("meeting_type"),
        provider,
        meeting_url: values.get("meeting_url"),
        location: values.get("location"),
        scheduled_at: values.get("scheduled_at"),
        duration_minutes: values.get("duration_minutes"),
        agenda: values.get("agenda"),
        internal_user_ids: values.getAll("internal_user_ids"),
        external_participants: external,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) return setMessage(body.message || "Creation impossible.");
    setMeetings(current => [body.meeting, ...current]);
    setExternal([]); setModal(null); form.reset();
    setMessage("Reunion Maximus planifiee et invitations traitees.");
  }

  async function update(payload: Row) {
    const response = await fetch("/api/maximus/meetings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(body.message || "Mise a jour impossible.");
    setMeetings(current => current.map(item => item.id === body.meeting.id ? body.meeting : item));
    setSelected(body.meeting);
    setMessage("Reunion mise a jour.");
  }

  function openRoom(meeting: Row) {
    setSelected(meeting);
    setModal("room");
    if (meeting.status === "scheduled") void update({ id: meeting.id, status: "in_progress" });
  }

  return <div className="grid gap-6">
    <section className="border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Communications Maximus</p><h2 className="mt-2 text-3xl font-black">Salle de reunions Maximus</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Planifiez des reunions entre membres du personnel Maximus ou invitez des participants externes avec un acces personnel. Cet espace est independant des consultations et appels NutVitaGlobalis.</p></div>{canCreate && <button onClick={() => setModal("create")} className="inline-flex items-center gap-2 rounded-md bg-[#ef7f3b] px-5 py-3 font-bold text-white"><CalendarPlus className="h-5" />Planifier</button>}</div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">{[
        ["Planifiees", meetings.filter(item => item.status === "scheduled").length, Clock],
        ["En cours", meetings.filter(item => item.status === "in_progress").length, Video],
        ["Terminees", meetings.filter(item => item.status === "completed").length, CheckCircle2],
        ["Participants", meetings.reduce((sum, item) => sum + (item.maximus_meeting_participants?.length || 0), 0), Users],
      ].map(([label, value, Icon]: any) => <div key={label} className="border bg-slate-50 p-4"><Icon className="h-5 text-emerald-700"/><p className="mt-3 text-sm font-bold text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div>)}</div>
    </section>

    {message && <p className="border-l-4 border-emerald-600 bg-white p-4 font-semibold">{message}</p>}

    <section className="border bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><h3 className="text-xl font-black">Registre des reunions</h3><p className="text-sm text-slate-500">{visible.length} reunion(s)</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-3 h-4 text-slate-400"/><input value={search} onChange={event => setSearch(event.target.value)} className="admin-input pl-9" placeholder="Rechercher"/></label><select value={status} onChange={event => setStatus(event.target.value)} className="admin-input"><option value="all">Tous les statuts</option><option value="scheduled">Planifiees</option><option value="in_progress">En cours</option><option value="completed">Terminees</option><option value="cancelled">Annulees</option></select></div></header>
      <div className="divide-y">{visible.map(meeting => <article key={meeting.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-3"><h4 className="font-black">{meeting.title}</h4><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{meeting.status}</span><span className="text-xs font-mono text-slate-400">{meeting.reference}</span></div><p className="mt-2 text-sm text-slate-600">{new Date(meeting.scheduled_at).toLocaleString("fr-FR")} · {meeting.duration_minutes} min · {meeting.meeting_type}</p><p className="mt-1 text-xs text-slate-500">{meeting.maximus_meeting_participants?.length || 0} participant(s), dont {(meeting.maximus_meeting_participants || []).filter((item: Row) => item.participant_type === "external").length} externe(s)</p></div><div className="flex flex-wrap gap-2">{meeting.provider === "physical" ? <span className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold"><MapPin className="h-4"/>{meeting.location}</span> : meeting.status !== "cancelled" && <button onClick={() => openRoom(meeting)} className="rounded-md bg-[#24945f] px-4 py-2 font-bold text-white">Ouvrir la salle</button>}<button onClick={() => { setSelected(meeting); setModal("minutes"); }} className="rounded-md border px-4 py-2 font-bold">Compte rendu</button>{meeting.status === "scheduled" && <button onClick={() => update({ id: meeting.id, status: "cancelled" })} className="rounded-md border px-4 py-2 font-bold text-red-700">Annuler</button>}</div></article>)}{!visible.length && <p className="p-10 text-center text-slate-500">Aucune reunion Maximus dans ce filtre.</p>}</div>
    </section>

    {modal === "create" && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4" onMouseDown={() => setModal(null)}><form onSubmit={create} onMouseDown={event => event.stopPropagation()} className="mx-auto my-6 grid max-w-4xl gap-5 bg-white p-7 shadow-2xl"><header className="flex justify-between"><div><p className="text-xs font-black uppercase text-[#ef7f3b]">Nouvelle reunion Maximus</p><h2 className="text-2xl font-black">Planification et invitations</h2></div><button type="button" onClick={() => setModal(null)}><X className="h-5"/></button></header><div className="grid gap-4 md:grid-cols-2"><Field label="Titre"><input name="title" required className="admin-input"/></Field><Field label="Type"><select name="meeting_type" className="admin-input"><option value="team">Equipe</option><option value="department">Departement</option><option value="management">Direction</option><option value="project">Projet</option><option value="mixed">Interne et externe</option><option value="external">Externe</option></select></Field><Field label="Date et heure"><input name="scheduled_at" type="datetime-local" required className="admin-input"/></Field><Field label="Duree (minutes)"><input name="duration_minutes" type="number" min="5" max="480" defaultValue="45" className="admin-input"/></Field><Field label="Mode"><select value={provider} onChange={event => setProvider(event.target.value)} className="admin-input"><option value="jitsi">Jitsi integre Maximus</option><option value="external">Lien externe: Zoom, Teams, Meet...</option><option value="physical">Rencontre physique</option></select></Field>{provider === "external" && <Field label="Lien HTTPS"><input name="meeting_url" type="url" required className="admin-input" placeholder="https://..."/></Field>}{provider === "physical" && <Field label="Lieu"><input name="location" required className="admin-input"/></Field>}</div><Field label="Personnel Maximus"><select name="internal_user_ids" multiple className="admin-input min-h-36">{users.map(user => <option key={user.id} value={user.id}>{user.full_name} · {user.email} · {(user.units || []).join(", ") || user.role}</option>)}</select></Field><Field label="Ordre du jour"><textarea name="agenda" className="admin-input min-h-24"/></Field><div className="border-t pt-5"><div className="flex items-center justify-between"><div><h3 className="font-black">Participants externes</h3><p className="text-sm text-slate-500">Chaque invite recevra un lien personnel.</p></div><button type="button" onClick={() => setExternal(current => [...current, { full_name: "", email: "", role: "participant" }])} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 font-bold"><UserPlus className="h-4"/>Ajouter</button></div><div className="mt-4 grid gap-3">{external.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"><input value={item.full_name} onChange={event => setExternal(current => current.map((row, i) => i === index ? { ...row, full_name: event.target.value } : row))} required className="admin-input" placeholder="Nom complet"/><input value={item.email} onChange={event => setExternal(current => current.map((row, i) => i === index ? { ...row, email: event.target.value } : row))} required type="email" className="admin-input" placeholder="email@externe.org"/><select value={item.role} onChange={event => setExternal(current => current.map((row, i) => i === index ? { ...row, role: event.target.value } : row))} className="admin-input"><option value="participant">Participant</option><option value="presenter">Presentateur</option><option value="observer">Observateur</option></select><button type="button" onClick={() => setExternal(current => current.filter((_, i) => i !== index))} className="grid h-11 w-11 place-items-center rounded-md bg-red-50 text-red-700"><X className="h-4"/></button></div>)}</div></div><div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setModal(null)} className="rounded-md border px-5 py-3 font-bold">Annuler</button><button disabled={busy} className="rounded-md bg-[#ef7f3b] px-5 py-3 font-bold text-white">{busy ? "Planification..." : "Planifier et inviter"}</button></div></form></div>}

    {modal === "room" && selected && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/90 p-4"><div className="mx-auto max-w-7xl"><header className="mb-3 flex flex-wrap items-center justify-between gap-3 text-white"><div><h2 className="text-xl font-black text-white">{selected.title}</h2><p className="text-sm text-white/60">{selected.reference} · {(selected.maximus_meeting_participants || []).length} participant(s)</p></div><div className="flex gap-2"><button onClick={() => navigator.clipboard.writeText(selected.meeting_url || "")} className="inline-flex items-center gap-2 rounded-md border border-white/30 px-3 py-2 text-sm font-bold"><Copy className="h-4"/>Copier le lien</button><button onClick={() => setModal(null)} className="rounded-md bg-white px-4 py-2 font-bold text-slate-900">Fermer</button></div></header><div className="mb-3 flex flex-wrap gap-2 bg-white p-3">{(selected.maximus_meeting_participants || []).map((participant: Row) => <span key={participant.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{participant.full_name} · {participant.participant_type}</span>)}</div><VideoRoom roomName={selected.room_name} displayName={users.find(item => item.id === currentUserId)?.full_name || "Equipe Maximus"} provider={selected.provider} meetingUrl={selected.meeting_url}/></div></div>}

    {modal === "minutes" && selected && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4" onMouseDown={() => setModal(null)}><form onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); void update({ id: selected.id, minutes: values.get("minutes"), decisions: String(values.get("decisions") || "").split("\n").filter(Boolean), status: "completed" }); setModal(null); }} onMouseDown={event => event.stopPropagation()} className="grid w-full max-w-2xl gap-4 bg-white p-7"><h2 className="text-2xl font-black">Compte rendu Maximus</h2><Field label="Synthese"><textarea name="minutes" defaultValue={selected.minutes || ""} className="admin-input min-h-36"/></Field><Field label="Decisions, une par ligne"><textarea name="decisions" defaultValue={(selected.decisions || []).join("\n")} className="admin-input min-h-28"/></Field><div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-md border px-4 py-2 font-bold">Fermer</button><button className="rounded-md bg-[#24945f] px-4 py-2 font-bold text-white">Terminer la reunion</button></div></form></div>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}
