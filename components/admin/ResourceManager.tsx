"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { EyeIcon, PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { ResourceConfig, slugify } from "@/lib/admin-resources";
import RichEditor from "./RichEditor";

type Row = Record<string, unknown> & { id: string };

export default function ResourceManager({ config }: { config: ResourceConfig }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"fr" | "en">("fr");
  const draftKey = `nutvita-draft-${config.table}`;
  const defaults = useMemo(() => Object.fromEntries(config.fields.map(field => [field.name, field.type === "boolean" ? false : field.name === "publication_locale_status" ? "both" : field.type === "select" ? (field.options?.[0] || "") : ""])), [config]);
  const visibleFields = config.fields.filter(field => !field.locale || field.locale === "both" || field.locale === tab);

  async function load() {
    setLoading(true);
    const { data, error } = await createClient().from(config.table).select("*").order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    setRows((data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [config.table]);

  function create() {
    const saved = localStorage.getItem(draftKey);
    setEditing(saved ? JSON.parse(saved) : ({ ...defaults, id: "" } as Row));
    setTab("fr");
    setOpen(true);
  }

  function change(name: string, value: unknown) {
    setEditing(current => {
      const next = { ...(current || {}), [name]: value } as Row;
      if (name === "title" && !next.slug) next.slug = slugify(String(value));
      if (name === "title_en" && !next.slug_en) next.slug_en = slugify(String(value));
      localStorage.setItem(draftKey, JSON.stringify(next));
      return next;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setMessage("");
    const payload = Object.fromEntries(Object.entries(editing).filter(([key]) => !["id", "created_at", "updated_at"].includes(key)));
    for (const field of config.fields) {
      if (field.type === "select" && !payload[field.name]) payload[field.name] = field.options?.[0] || "";
    }
    const query = editing.id ? createClient().from(config.table).update(payload).eq("id", editing.id) : createClient().from(config.table).insert(payload);
    const { error } = await query;
    if (error) {
      setMessage(error.message);
      return;
    }
    localStorage.removeItem(draftKey);
    setOpen(false);
    setEditing(null);
    setMessage("Enregistre avec succes.");
    load();
  }

  async function remove(row: Row) {
    if (!confirm(`Supprimer definitivement "${String(row[config.titleField])}" ? Cette action est irreversible.`)) return;
    const check = prompt("Tapez SUPPRIMER pour confirmer");
    if (check !== "SUPPRIMER") return;
    const { error } = await createClient().from(config.table).delete().eq("id", row.id);
    if (error) setMessage(error.message);
    else load();
  }

  async function toggle(row: Row) {
    if (!config.statusField) return;
    const field = config.fields.find(item => item.name === config.statusField);
    const options = field?.options || [];
    const next = String(row[config.statusField]) === options[1] ? options[0] : options[1];
    const payload: Record<string, unknown> = { [config.statusField]: next };
    if (config.table === "articles") payload.published_at = next === "published" ? new Date().toISOString() : row.published_at;
    await createClient().from(config.table).update(payload).eq("id", row.id);
    load();
  }

  return <div>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black">{config.title}</h1>
        <p className="mt-1 text-slate-500">Creez, traduisez et publiez vos contenus en francais et en anglais.</p>
      </div>
      <button onClick={create} className="btn-primary"><PlusIcon className="mr-2 h-5" />Ajouter</button>
    </div>
    {message && <p className="mb-5 rounded-xl bg-white p-4 text-sm font-semibold text-forest">{message}</p>}
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[780px] text-left">
        <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-400"><tr><th className="p-4">Contenu</th><th className="p-4">Statut</th><th className="p-4">Langues</th><th className="p-4">Mise a jour</th><th className="p-4 text-right">Actions</th></tr></thead>
        <tbody>
          {loading ? <tr><td colSpan={5} className="p-8 text-center">Chargement...</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Aucun contenu.</td></tr> : rows.map(row => <tr key={row.id} className="border-b last:border-0">
            <td className="p-4"><b className="text-forest">{String(row[config.titleField] || "Sans titre")}</b><p className="text-xs text-slate-400">{String(row.category || row.role || "")}</p></td>
            <td className="p-4">{config.statusField ? <button onClick={() => toggle(row)} className={`rounded-full px-3 py-1 text-xs font-bold ${["published", "active", "visible"].includes(String(row[config.statusField])) ? "bg-mint text-leaf" : "bg-slate-100 text-slate-500"}`}>{String(row[config.statusField])}</button> : "-"}</td>
            <td className="p-4 text-sm font-bold text-leaf">{String(row.publication_locale_status || "both").toUpperCase()}</td>
            <td className="p-4 text-sm text-slate-500">{row.updated_at ? new Date(String(row.updated_at)).toLocaleDateString("fr-FR") : "-"}</td>
            <td className="p-4"><div className="flex justify-end gap-2">{config.table === "articles" && <a href={`/ressources/${row.slug}?preview=${row.id}`} target="_blank" className="admin-icon" title="Previsualiser"><EyeIcon className="h-5" /></a>}<button onClick={() => { setEditing(row); setTab("fr"); setOpen(true); }} className="admin-icon" title="Modifier"><PencilSquareIcon className="h-5" /></button><button onClick={() => remove(row)} className="admin-icon text-red-600" title="Supprimer"><TrashIcon className="h-5" /></button></div></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {open && editing && <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4">
      <div className="mx-auto my-6 max-w-4xl rounded-3xl bg-white p-6 md:p-9">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-black">{editing.id ? "Modifier" : "Ajouter"} {config.singular}</h2>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-1 text-sm font-black">
              <button type="button" onClick={() => setTab("fr")} className={`rounded-full px-4 py-2 ${tab === "fr" ? "bg-forest text-white" : "text-forest"}`}>Francais</button>
              <button type="button" onClick={() => setTab("en")} className={`rounded-full px-4 py-2 ${tab === "en" ? "bg-forest text-white" : "text-forest"}`}>English</button>
            </div>
            <button onClick={() => setOpen(false)} className="text-2xl">x</button>
          </div>
        </div>
        <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
          {visibleFields.map(field => <label key={field.name} className={`grid gap-2 text-sm font-bold ${(field.type === "textarea" || field.type === "richtext") ? "md:col-span-2" : ""}`}>
            {field.label}{field.help && <span className="font-normal text-slate-400">{field.help}</span>}
            {field.type === "richtext" ? <RichEditor value={String(editing[field.name] || "")} onChange={value => change(field.name, value)} /> : field.type === "image" ? <ImageInput value={String(editing[field.name] || "")} onChange={value => change(field.name, value)} /> : field.type === "textarea" ? <textarea rows={4} required={field.required && tab === "fr"} value={String(editing[field.name] || "")} onChange={event => change(field.name, event.target.value)} className="admin-input" /> : field.type === "select" ? <select value={String(editing[field.name] || "")} onChange={event => change(field.name, event.target.value)} className="admin-input">{field.options?.map(option => <option key={option}>{option}</option>)}</select> : field.type === "boolean" ? <input type="checkbox" checked={Boolean(editing[field.name])} onChange={event => change(field.name, event.target.checked)} className="h-5 w-5 accent-green-700" /> : <input type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text"} required={field.required && tab === "fr"} value={String(editing[field.name] || "")} onChange={event => change(field.name, field.type === "number" ? Number(event.target.value) : event.target.value)} className="admin-input" />}
          </label>)}
          <div className="flex gap-3 md:col-span-2"><button className="btn-primary" type="submit">Enregistrer</button><button className="btn-secondary" type="button" onClick={() => setOpen(false)}>Fermer</button><span className="self-center text-xs text-slate-400">Brouillon sauvegarde automatiquement sur cet appareil.</span></div>
        </form>
      </div>
    </div>}
  </div>;
}

function ImageInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [message, setMessage] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("Televersement en cours...");
    const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    const path = `articles/${crypto.randomUUID()}-${safe}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("public-assets").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) {
      setMessage(`${error.message}. Verifiez que le bucket public-assets existe dans Supabase.`);
      return;
    }
    const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
    onChange(data.publicUrl);
    setMessage("Image ajoutee.");
  }
  return <div className="grid gap-3">
    <input type="url" value={value} onChange={event => onChange(event.target.value)} placeholder="https://..." className="admin-input" />
    <div className="flex flex-wrap items-center gap-3">
      <label className="btn-secondary cursor-pointer px-4 py-2 text-sm">Televerser une image<input type="file" accept="image/*" onChange={upload} className="hidden" /></label>
      {value && <a href={value} target="_blank" className="text-sm font-bold text-leaf">Ouvrir l'image</a>}
    </div>
    {value && <img src={value} alt="" className="h-44 w-full rounded-xl object-cover" />}
    {message && <p className="text-xs font-semibold text-slate-500">{message}</p>}
  </div>;
}
