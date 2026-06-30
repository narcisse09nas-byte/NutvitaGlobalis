"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Archive, ChevronDown, Mail, MessageSquare, Paperclip, Plus, Search, Send, Users, X } from "lucide-react";

type Row = Record<string, any>;
type Mode = "chat" | "email";

export default function CommunicationCenter({ scope = "maximus" }: { scope?: string }) {
  const [mode, setMode] = useState<Mode>("chat");
  const [conversations, setConversations] = useState<Row[]>([]);
  const [contacts, setContacts] = useState<Row[]>([]);
  const [currentUser, setCurrentUser] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [messages, setMessages] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function loadWorkspace() {
    const response = await fetch(`/api/communications?scope=${scope}`);
    const result = await response.json();
    if (!response.ok) return setNotice(result.message);
    setConversations(result.conversations || []);
    setContacts(result.contacts || []);
    setCurrentUser(result.current_user);
    if (!selected && result.conversations?.length) setSelected(result.conversations[0]);
  }
  async function loadMessages(conversation = selected) {
    if (!conversation) return;
    const response = await fetch(`/api/communications?scope=${scope}&conversation_id=${conversation.id}`);
    const result = await response.json();
    if (response.ok) {
      setMessages(result.messages || []);
      setMembers(result.members || []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }
  useEffect(() => { loadWorkspace(); }, [scope]);
  useEffect(() => {
    loadMessages();
    const timer = setInterval(() => loadMessages(), 5000);
    return () => clearInterval(timer);
  }, [selected?.id]);

  const filtered = useMemo(() => conversations.filter(item => `${item.title} ${item.priority}`.toLowerCase().includes(search.toLowerCase())), [conversations, search]);
  const contactMap = useMemo(() => new Map(contacts.map(item => [item.id, item])), [contacts]);

  async function uploadAttachment(targetFile: File) {
    if (!currentUser) return null;
    const safe = targetFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${currentUser.id}/${scope}/${crypto.randomUUID()}-${safe}`;
    const result = await createClient().storage.from("collaboration-files").upload(path, targetFile, { contentType: targetFile.type });
    if (result.error) throw result.error;
    return path;
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || (!message.trim() && !file)) return;
    setBusy(true);
    try {
      const path = file ? await uploadAttachment(file) : null;
      const response = await fetch(`/api/communications?scope=${scope}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_message", conversation_id: selected.id, message, attachment_path: path, attachment_name: file?.name }),
      });
      const result = await response.json();
      if (!response.ok) setNotice(result.message);
      else {
        setMessages(items => [...items, result.message]);
        setMessage(""); setFile(null);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Envoi impossible."); }
    setBusy(false);
  }

  async function openAttachment(path: string) {
    const result = await createClient().storage.from("collaboration-files").createSignedUrl(path, 300);
    if (result.error) setNotice(result.error.message); else window.open(result.data.signedUrl, "_blank");
  }

  return <div className="min-h-[680px] overflow-hidden rounded-lg border bg-white">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
      <div><p className="text-xs font-black uppercase text-[#ef7f3b]">{scope === "maximus" ? "Canal interne Maximus" : "Administration NutVitaGlobalis"}</p><h2 className="text-xl font-black text-[#123d32]">Centre de communication</h2></div>
      <div className="flex items-center gap-2"><div className="flex rounded-md border p-1"><button onClick={() => setMode("chat")} className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-bold ${mode === "chat" ? "bg-[#123d32] text-white" : ""}`}><MessageSquare className="h-4 w-4" />Chat</button><button onClick={() => setMode("email")} className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-bold ${mode === "email" ? "bg-[#123d32] text-white" : ""}`}><Mail className="h-4 w-4" />Email</button></div><button onClick={() => setComposeOpen(true)} className="flex items-center gap-2 rounded-md bg-[#ef7f3b] px-4 py-2.5 text-sm font-bold text-white"><Plus className="h-4 w-4" />{mode === "chat" ? "Nouveau chat" : "Nouvel email"}</button></div>
    </header>
    {notice && <div className="flex items-center justify-between border-b bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900"><span>{notice}</span><button onClick={() => setNotice("")}><X className="h-4 w-4" /></button></div>}

    {mode === "email" ? <EmailWorkspace scope={scope} contacts={contacts} currentUser={currentUser} uploadAttachment={uploadAttachment} setNotice={setNotice} open={composeOpen} close={() => setComposeOpen(false)} /> :
    <div className="grid min-h-[610px] lg:grid-cols-[310px_minmax(0,1fr)_260px]">
      <aside className="border-r bg-slate-50">
        <div className="border-b p-4"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="admin-input pl-9" placeholder="Rechercher un fil..." /></div></div>
        <div className="max-h-[550px] overflow-y-auto p-2">{filtered.map(item => <button key={item.id} onClick={() => setSelected(item)} className={`mb-1 w-full border-l-4 px-4 py-3 text-left ${selected?.id === item.id ? "border-[#ef7f3b] bg-white" : "border-transparent hover:bg-white"}`}><div className="flex justify-between gap-3"><b className="truncate text-sm">{item.title || "Conversation"}</b>{item.priority === "urgent" && <span className="text-[10px] font-black uppercase text-red-600">Urgent</span>}</div><p className="mt-1 text-xs text-slate-400">{item.conversation_type === "team" ? "Groupe" : "Direct"} · {new Date(item.updated_at).toLocaleDateString("fr-FR")}</p></button>)}{!filtered.length && <p className="p-6 text-center text-sm text-slate-400">Aucune conversation.</p>}</div>
      </aside>

      <section className="flex min-w-0 flex-col">
        {selected ? <><div className="flex items-center justify-between border-b px-5 py-4"><div><h3 className="font-black">{selected.title}</h3><p className="text-xs text-slate-400">{members.length} participant(s)</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{selected.priority || "normal"}</span></div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8faf9] p-5">{messages.map(item => {
          const mine = item.sender_id === currentUser?.id;
          const sender = mine ? currentUser : contactMap.get(item.sender_id);
          return <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-lg px-4 py-3 ${mine ? "bg-[#123d32] text-white" : "border bg-white"}`}>{!mine && <p className="mb-1 text-xs font-black text-[#24945f]">{sender?.full_name || "Participant"}</p>}<p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>{item.attachment_path && <button onClick={() => openAttachment(item.attachment_path)} className={`mt-2 flex items-center gap-2 text-xs font-bold ${mine ? "text-orange-200" : "text-[#24945f]"}`}><Paperclip className="h-3.5 w-3.5" />{item.attachment_name || "Piece jointe"}</button>}<p className={`mt-2 text-[10px] ${mine ? "text-white/50" : "text-slate-400"}`}>{new Date(item.created_at).toLocaleString("fr-FR")}</p></div></div>;
        })}<div ref={endRef} /></div>
        <form onSubmit={sendMessage} className="border-t p-4"><textarea value={message} onChange={event => setMessage(event.target.value)} rows={2} className="admin-input resize-none" placeholder="Ecrire un message..." /><div className="mt-3 flex items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-500"><Paperclip className="h-4 w-4" />{file?.name || "Joindre"}<input type="file" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /></label><button disabled={busy} className="flex items-center gap-2 rounded-md bg-[#24945f] px-4 py-2 font-bold text-white"><Send className="h-4 w-4" />Envoyer</button></div></form></> :
        <div className="grid flex-1 place-items-center text-center text-slate-400"><div><MessageSquare className="mx-auto h-10 w-10" /><p className="mt-3">Selectionnez ou creez une conversation.</p></div></div>}
      </section>

      <aside className="hidden border-l p-5 lg:block"><h3 className="flex items-center gap-2 font-black"><Users className="h-4 w-4" />Participants</h3><div className="mt-4 space-y-3">{members.map(member => { const contact = member.user_id === currentUser?.id ? currentUser : contactMap.get(member.user_id); return <div key={member.user_id}><p className="text-sm font-bold">{contact?.full_name || "Utilisateur"}</p><p className="text-xs text-slate-400">{contact?.category || member.member_role}</p></div>; })}</div><div className="mt-8 border-t pt-5"><p className="text-xs font-bold uppercase text-slate-400">Conservation</p><p className="mt-2 text-sm text-slate-500">Ce fil reste disponible aux membres et peut servir de preuve dans un processus interne.</p></div></aside>
    </div>}
    {mode === "chat" && composeOpen && <ConversationComposer contacts={contacts} currentUser={currentUser} scope={scope} close={() => setComposeOpen(false)} created={conversation => { setConversations(items => [conversation, ...items]); setSelected(conversation); setComposeOpen(false); }} setNotice={setNotice} />}
  </div>;
}

function RecipientPicker({ contacts, selected, setSelected, allowExternal = false }: { contacts: Row[]; selected: Row[]; setSelected: (items: Row[]) => void; allowExternal?: boolean }) {
  const [query, setQuery] = useState("");
  const [external, setExternal] = useState("");
  const filtered = contacts.filter(item => !selected.some(value => value.email === item.email) && `${item.full_name} ${item.email} ${item.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  return <div><div className="flex min-h-12 flex-wrap gap-2 rounded-md border bg-white p-2">{selected.map(item => <span key={item.email} className="flex items-center gap-1 rounded-full bg-[#e7f5ee] px-3 py-1 text-xs font-bold text-[#123d32]">{item.full_name || item.email}<button type="button" onClick={() => setSelected(selected.filter(value => value.email !== item.email))}><X className="h-3 w-3" /></button></span>)}<input value={query} onChange={event => setQuery(event.target.value)} className="min-w-40 flex-1 border-0 px-2 outline-none" placeholder="Rechercher une personne..." /></div>{query && <div className="mt-1 max-h-52 overflow-y-auto rounded-md border bg-white shadow-xl">{filtered.map(item => <button type="button" key={item.id} onClick={() => { setSelected([...selected, item]); setQuery(""); }} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"><span><b className="block text-sm">{item.full_name}</b><span className="text-xs text-slate-400">{item.email}</span></span><span className="text-xs font-bold text-[#24945f]">{item.category}</span></button>)}</div>}{allowExternal && <div className="mt-3 flex gap-2"><input type="email" value={external} onChange={event => setExternal(event.target.value)} className="admin-input" placeholder="Adresse externe..." /><button type="button" onClick={() => { if (external.includes("@")) { setSelected([...selected, { id: external, email: external, full_name: external, category: "Externe" }]); setExternal(""); } }} className="rounded-md border px-4 font-bold">Ajouter</button></div>}</div>;
}

function ConversationComposer({ contacts, currentUser, scope, close, created, setNotice }: { contacts: Row[]; currentUser: Row | null; scope: string; close: () => void; created: (item: Row) => void; setNotice: (value: string) => void }) {
  const [selected, setSelected] = useState<Row[]>([]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/communications?scope=${scope}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_conversation", recipient_ids: selected.map(item => item.id), title: data.get("title"), priority: data.get("priority"), message: data.get("message") }) });
    const result = await response.json();
    if (response.ok) created(result.conversation); else setNotice(result.message);
  }
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4" onMouseDown={close}><form onSubmit={submit} onMouseDown={event => event.stopPropagation()} className="mx-auto my-8 grid max-w-2xl gap-5 rounded-lg bg-white p-6"><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-[#ef7f3b]">Nouvelle conversation</p><h2 className="text-2xl font-black">Messagerie {scope === "maximus" ? "Maximus" : "NutVitaGlobalis"}</h2></div><button type="button" onClick={close}><X /></button></div><label className="grid gap-2 text-sm font-bold">Initiateur<input readOnly className="admin-input bg-slate-50" value={`${currentUser?.full_name || ""} · ${currentUser?.email || ""}`} /></label><label className="grid gap-2 text-sm font-bold">Destinataires / equipe<RecipientPicker contacts={contacts} selected={selected} setSelected={setSelected} /></label><div className="grid gap-4 sm:grid-cols-[1fr_180px]"><label className="grid gap-2 text-sm font-bold">Sujet<input name="title" required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Priorite<select name="priority" className="admin-input"><option value="normal">Normale</option><option value="high">Haute</option><option value="urgent">Urgente</option><option value="low">Basse</option></select></label></div><label className="grid gap-2 text-sm font-bold">Premier message<textarea name="message" rows={5} className="admin-input" /></label><div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={close} className="rounded-md border px-4 py-2 font-bold">Annuler</button><button disabled={!selected.length} className="rounded-md bg-[#ef7f3b] px-5 py-2 font-bold text-white disabled:opacity-40">Creer le fil</button></div></form></div>;
}

function EmailWorkspace({ scope, contacts, currentUser, uploadAttachment, setNotice, open, close }: { scope: string; contacts: Row[]; currentUser: Row | null; uploadAttachment: (file: File) => Promise<string | null>; setNotice: (value: string) => void; open: boolean; close: () => void }) {
  const [selected, setSelected] = useState<Row[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) return <div className="grid min-h-[610px] place-items-center bg-slate-50 text-center"><div><Mail className="mx-auto h-12 w-12 text-[#24945f]" /><h3 className="mt-4 text-xl font-black">Composez un email interne ou externe</h3><p className="mt-2 text-sm text-slate-500">Les envois sont journalises et peuvent etre rattaches aux recrutements.</p></div></div>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const path = file ? await uploadAttachment(file) : null;
      const response = await fetch(`/api/communications?scope=${scope}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send_email", recipients: selected.map(item => item.email), subject: form.get("subject"), message: form.get("message"), attachment_path: path, attachment_name: file?.name }) });
      const result = await response.json();
      setNotice(response.ok ? "Email envoye et journalise." : result.message);
      if (response.ok) { setSelected([]); setFile(null); close(); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Envoi impossible."); }
    setBusy(false);
  }
  return <form onSubmit={submit} className="mx-auto grid min-h-[610px] max-w-4xl content-start gap-5 p-6"><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-[#ef7f3b]">Nouvel email</p><h3 className="text-2xl font-black">Message sortant</h3></div><button type="button" onClick={close}><X /></button></div><label className="grid gap-2 text-sm font-bold">Expediteur<input readOnly value={`${currentUser?.full_name || ""} · ${currentUser?.email || ""}`} className="admin-input bg-slate-50" /></label><label className="grid gap-2 text-sm font-bold">Destinataires internes ou externes<RecipientPicker contacts={contacts} selected={selected} setSelected={setSelected} allowExternal /></label><label className="grid gap-2 text-sm font-bold">Sujet<input required name="subject" className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Message<textarea required name="message" rows={10} className="admin-input" /></label><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm font-bold"><Paperclip className="h-4 w-4" />{file?.name || "Joindre un fichier"}<input type="file" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /></label><button disabled={busy || !selected.length} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />{busy ? "Envoi..." : "Envoyer l email"}</button></div></form>;
}
