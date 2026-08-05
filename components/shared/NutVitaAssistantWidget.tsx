"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";

type Message = { role: "user" | "assistant"; content: string };

export default function NutVitaAssistantWidget({ title = "NutVita AI", subtitle, suggestions = [], standalone = false }: { title?: string; subtitle?: string; suggestions?: string[]; standalone?: boolean }) {
  const [open, setOpen] = useState(standalone);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      const response = await fetch("/api/nutvita-ai/chat");
      if (response.ok) {
        const result = await response.json();
        setMessages((result.messages || []).map((row: any) => ({ role: row.role, content: row.content })));
      }
      setLoaded(true);
    })();
  }, [open, loaded]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const value = text.trim();
    if (!value || loading) return;
    setError("");
    setInput("");
    setMessages(current => [...current, { role: "user", content: value }]);
    setLoading(true);
    const response = await fetch("/api/nutvita-ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value }) });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) { setError(result.message || "NutVita AI est momentanement indisponible."); return; }
    setMessages(current => [...current, { role: "assistant", content: result.reply }]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  if (!open) {
    return <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-black">{title}</h2>
      {subtitle && <p className="mt-1 text-sm font-bold">{subtitle}</p>}
      <div className="mt-4 grid gap-2">
        {suggestions.map(question => <button key={question} onClick={() => { setOpen(true); setTimeout(() => send(question), 150); }} className="rounded-xl border p-3 text-left text-xs font-bold hover:bg-mint">{question}</button>)}
      </div>
      <button onClick={() => setOpen(true)} className="btn-primary mt-4 w-full">Ouvrir l'assistant</button>
    </div>;
  }

  return <div className={`flex flex-col rounded-3xl border bg-white shadow-xl ${standalone ? "h-[min(72vh,760px)] min-h-[560px]" : "h-[480px]"}`}>
    <div className="flex items-center justify-between rounded-t-2xl bg-forest p-4 text-white">
      <span className="flex items-center gap-2 font-black"><SparklesIcon className="h-5 w-5 text-orange" />{title}</span>
      {!standalone && <button onClick={() => setOpen(false)} aria-label="Fermer"><XMarkIcon className="h-5 w-5" /></button>}
    </div>
    <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {!messages.length && !loading && <p className="text-sm text-slate-400">Posez une question sur votre suivi, vos mesures ou vos progrès.</p>}
      {messages.map((message, index) => <div key={index} className={`max-w-[85%] rounded-2xl p-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-mint text-forest" : "bg-slate-100 text-slate-700"}`}>{message.content}</div>)}
      {loading && <div className="max-w-[85%] rounded-2xl bg-slate-100 p-3 text-sm text-slate-400">NutVita AI reflechit...</div>}
      {error && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{error}</p>}
    </div>
    <form onSubmit={submit} className="flex gap-2 border-t p-3">
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ecrivez votre question..." className="admin-input flex-1" />
      <button disabled={loading || !input.trim()} className="btn-primary px-4">Envoyer</button>
    </form>
  </div>;
}
