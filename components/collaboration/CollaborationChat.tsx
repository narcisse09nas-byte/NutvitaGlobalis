"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

type Row = Record<string, any>;

export default function CollaborationChat({ conversations: initial, currentUserId, contacts = [] }: { conversations: Row[]; currentUserId: string; contacts?: Row[] }) {
  const [conversations, setConversations] = useState(initial), [selected, setSelected] = useState(initial[0]?.id || ""), [messages, setMessages] = useState<Row[]>([]), [body, setBody] = useState(""), [error, setError] = useState("");
  async function load() {
    if (!selected) return;
    const { data, error } = await createClient().from("collaboration_messages").select("*").eq("conversation_id", selected).order("created_at");
    if (error) setError(error.message); else setMessages(data || []);
  }
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [selected]);

  async function createConversation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form), recipients = fd.getAll("recipient_ids").map(String).filter(Boolean);
    if (!recipients.length) return;
    const selectedContacts = contacts.filter(x => recipients.includes(x.id));
    const title = String(fd.get("title") || "") || (selectedContacts.length === 1 ? `Echange avec ${selectedContacts[0].full_name}` : `Groupe ${selectedContacts.map(x => x.full_name).slice(0, 3).join(", ")}`);
    const supabase = createClient(), { data: conversation, error } = await supabase.from("collaboration_conversations").insert({ title, conversation_type: recipients.length > 1 ? "team" : "direct", created_by: currentUserId }).select().single();
    if (error) {
      setError(error.message);
      return;
    }
    const members = Array.from(new Set([currentUserId, ...recipients]));
    await supabase.from("collaboration_members").insert(members.map(user_id => ({ conversation_id: conversation.id, user_id, member_role: contacts.find(c => c.id === user_id)?.member_role || "member" })));
    setConversations([conversation, ...conversations]);
    setSelected(conversation.id);
    form.reset();
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || !selected) return;
    const { data, error } = await createClient().from("collaboration_messages").insert({ conversation_id: selected, sender_id: currentUserId, body: body.trim() }).select().single();
    if (error) setError(error.message); else { setMessages([...messages, data]); setBody(""); }
  }

  return <div className="grid gap-5 lg:grid-cols-[310px_1fr]"><aside className="rounded-2xl border bg-white p-4">{contacts.length > 0 && <form onSubmit={createConversation} className="mb-5 grid gap-2"><input name="title" className="admin-input text-sm" placeholder="Titre du groupe (facultatif)" /><select name="recipient_ids" required multiple className="admin-input min-h-36 text-sm">{contacts.filter(c => c.id !== currentUserId).map(c => <option key={c.id} value={c.id}>{c.full_name} - {c.member_role || c.department || "contact"}</option>)}</select><button className="btn-secondary px-4 py-2">Creer discussion</button></form>}<h2 className="mb-3 font-black">Conversations</h2>{conversations.map(c => <button key={c.id} onClick={() => setSelected(c.id)} className={`mb-2 w-full rounded-xl p-3 text-left text-sm font-bold ${selected === c.id ? "bg-mint text-leaf" : "bg-slate-50"}`}>{c.title || "Conversation"}</button>)}{!conversations.length && <p className="text-sm text-slate-400">Aucune conversation.</p>}</aside><section className="rounded-2xl border bg-white"><div className="grid min-h-[420px] max-h-[520px] content-start gap-3 overflow-y-auto p-5">{messages.map(m => <div key={m.id} className={`max-w-[85%] rounded-2xl p-4 ${m.sender_id === currentUserId ? "ml-auto bg-forest text-white" : "bg-slate-100"}`}><p className="whitespace-pre-wrap text-sm">{m.body}</p><p className={`mt-2 text-[10px] ${m.sender_id === currentUserId ? "text-white/50" : "text-slate-400"}`}>{new Date(m.created_at).toLocaleString("fr-FR")}</p></div>)}</div><form onSubmit={send} className="flex gap-3 border-t p-4"><input value={body} onChange={e => setBody(e.target.value)} className="admin-input" placeholder="Ecrire un message..." /><button className="btn-primary px-5"><PaperAirplaneIcon className="h-5" /></button></form>{error && <p className="px-4 pb-4 text-sm text-red-600">{error}</p>}</section></div>;
}
