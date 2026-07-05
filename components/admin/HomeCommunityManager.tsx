"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { CheckIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

type Row = Record<string, any>;
type Kind = "announcement" | "gallery" | "topic";
const configs = {
  announcement: {
    table: "homepage_announcements",
    title: "Dernières annonces",
    empty: { title_fr: "", title_en: "", summary_fr: "", summary_en: "", link_url: "", status: "draft", published_at: new Date().toISOString() },
  },
  gallery: {
    table: "homepage_gallery_items",
    title: "Galerie",
    empty: { title_fr: "", title_en: "", caption_fr: "", caption_en: "", image_url: "", sort_order: 0, status: "draft" },
  },
  topic: {
    table: "homepage_discussion_topics",
    title: "Sujets de conversation",
    empty: { title_fr: "", title_en: "", description_fr: "", description_en: "", status: "draft" },
  },
} as const;

function Input({ label, value, onChange, area = false, required = true }: { label: string; value: unknown; onChange: (value: string) => void; area?: boolean; required?: boolean }) {
  const props = { required, className: "admin-input", value: String(value || ""), onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value) };
  return <label className="grid gap-2 text-sm font-bold">{label}{area ? <textarea {...props} rows={3} /> : <input {...props} />}</label>;
}

function ContentEditor({ kind, initial, onNotice }: { kind: Kind; initial: Row[]; onNotice: (value: string) => void }) {
  const config = configs[kind];
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Row>({ ...config.empty });
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  async function save(event: FormEvent) {
    event.preventDefault();
    const payload = { ...draft };
    delete payload.created_at; delete payload.updated_at;
    const { data, error } = await supabase.from(config.table).upsert(payload).select().single();
    if (error) return onNotice(error.message);
    setRows([data, ...rows.filter((row) => row.id !== data.id)]);
    setDraft({ ...config.empty });
    onNotice("Contenu enregistré.");
  }
  async function remove(id: string) {
    if (!confirm("Supprimer définitivement cet élément ?")) return;
    const { error } = await supabase.from(config.table).delete().eq("id", id);
    if (error) return onNotice(error.message);
    setRows(rows.filter((row) => row.id !== id));
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true);
    const path = `homepage/gallery/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type });
    if (error) onNotice(error.message);
    else setDraft({ ...draft, image_url: supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl });
    setUploading(false);
  }

  const secondFr = kind === "announcement" ? "summary_fr" : kind === "gallery" ? "caption_fr" : "description_fr";
  const secondEn = kind === "announcement" ? "summary_en" : kind === "gallery" ? "caption_en" : "description_en";
  const statuses = kind === "topic" ? [["draft","Brouillon"],["open","Ouvert"],["closed","Fermé"],["archived","Archivé"]] : [["draft","Brouillon"],["published","Publié"],["archived","Archivé"]];
  return <section>
    <h2 className="text-2xl font-black">{config.title}</h2>
    <p className="mt-1 text-sm text-slate-500">Les deux versions linguistiques sont obligatoires avant publication.</p>
    <div className="mt-5 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
      <form onSubmit={save} className="grid gap-4 border bg-white p-5 md:grid-cols-2">
        <Input label="Titre français" value={draft.title_fr} onChange={(value) => setDraft({ ...draft, title_fr: value })} />
        <Input label="English title" value={draft.title_en} onChange={(value) => setDraft({ ...draft, title_en: value })} />
        <div className="md:col-span-2"><Input area required={kind !== "gallery"} label={kind === "topic" ? "Description française" : kind === "announcement" ? "Résumé français" : "Légende française"} value={draft[secondFr]} onChange={(value) => setDraft({ ...draft, [secondFr]: value })} /></div>
        <div className="md:col-span-2"><Input area required={kind !== "gallery"} label={kind === "topic" ? "English description" : kind === "announcement" ? "English summary" : "English caption"} value={draft[secondEn]} onChange={(value) => setDraft({ ...draft, [secondEn]: value })} /></div>
        {kind === "announcement" && <Input required={false} label="Lien facultatif" value={draft.link_url} onChange={(value) => setDraft({ ...draft, link_url: value })} />}
        {kind === "gallery" && <><div className="md:col-span-2"><Input label="URL de l’image" value={draft.image_url} onChange={(value) => setDraft({ ...draft, image_url: value })} /></div><label className="grid gap-2 text-sm font-bold">Téléverser une image<input type="file" accept="image/jpeg,image/png,image/webp" className="admin-input" disabled={uploading} onChange={upload} /></label></>}
        <label className="grid gap-2 text-sm font-bold">Statut<select className="admin-input" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button disabled={uploading} className="btn-primary justify-self-start md:col-span-2"><PlusIcon className="mr-2 h-4" />{draft.id ? "Mettre à jour" : "Ajouter"}</button>
      </form>
      <div className="divide-y border bg-white">{rows.map((row) => <div key={row.id} className="flex items-start gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-black">{row.title_fr}</p><p className="truncate text-sm text-slate-500">{row.title_en}</p><span className="text-xs font-bold uppercase text-leaf">{row.status}</span></div><button title="Modifier" onClick={() => setDraft(row)} className="grid h-9 w-9 place-items-center"><PencilSquareIcon className="h-5" /></button><button title="Supprimer" onClick={() => remove(row.id)} className="grid h-9 w-9 place-items-center text-red-600"><TrashIcon className="h-5" /></button></div>)}{!rows.length && <p className="p-6 text-sm text-slate-500">Aucun contenu.</p>}</div>
    </div>
  </section>;
}

export default function HomeCommunityManager({ initialAnnouncements, initialGallery, initialTopics, initialMessages }: { initialAnnouncements: Row[]; initialGallery: Row[]; initialTopics: Row[]; initialMessages: Row[] }) {
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  async function moderate(id: string, status: "approved" | "rejected") {
    const { error } = await createClient().from("homepage_discussion_messages").update({ status, moderated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setNotice(error.message);
    setMessages(messages.map((row) => row.id === id ? { ...row, status } : row));
    setNotice(status === "approved" ? "Contribution publiée." : "Contribution rejetée.");
  }
  return <div className="space-y-12">
    {notice && <p className="border border-leaf/20 bg-mint p-4 text-sm font-bold text-forest">{notice}</p>}
    <ContentEditor kind="announcement" initial={initialAnnouncements} onNotice={setNotice} />
    <ContentEditor kind="gallery" initial={initialGallery} onNotice={setNotice} />
    <ContentEditor kind="topic" initial={initialTopics} onNotice={setNotice} />
    <section><h2 className="text-2xl font-black">Modération des contributions</h2><div className="mt-5 overflow-x-auto border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-4">Auteur</th><th className="p-4">Sujet</th><th className="p-4">Contribution</th><th className="p-4">Statut</th><th className="p-4">Actions</th></tr></thead><tbody>{messages.map((row) => <tr key={row.id} className="border-t"><td className="p-4"><b>{row.author_name}</b><br/><span className="text-xs text-slate-500">{row.author_email}</span></td><td className="p-4">{row.homepage_discussion_topics?.title_fr}</td><td className="max-w-md p-4 leading-6">{row.message}</td><td className="p-4 font-bold uppercase">{row.status}</td><td className="p-4"><div className="flex gap-2"><button title="Approuver" onClick={() => moderate(row.id,"approved")} className="grid h-9 w-9 place-items-center bg-mint text-leaf"><CheckIcon className="h-5"/></button><button title="Rejeter" onClick={() => moderate(row.id,"rejected")} className="grid h-9 w-9 place-items-center bg-red-50 text-red-600"><XMarkIcon className="h-5"/></button></div></td></tr>)}</tbody></table>{!messages.length && <p className="p-6 text-sm text-slate-500">Aucune contribution.</p>}</div></section>
  </div>;
}
