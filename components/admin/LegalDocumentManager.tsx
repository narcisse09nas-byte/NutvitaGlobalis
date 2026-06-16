"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { legalTemplates, sectionsToText, textToSections, type LegalTemplate } from "@/lib/legal-documents";

type Row = Record<string, any>;

export default function LegalDocumentManager({ documents, translations, versions }: { documents: Row[]; translations: Row[]; versions: Row[] }) {
  const [docs, setDocs] = useState<Row[]>(documents);
  const [items, setItems] = useState<Row[]>(translations);
  const [history, setHistory] = useState<Row[]>(versions);
  const [selectedKey, setSelectedKey] = useState(legalTemplates[0].key);
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [message, setMessage] = useState("");
  const template = legalTemplates.find(item => item.key === selectedKey) || legalTemplates[0];
  const doc = docs.find(item => item.document_key === selectedKey);
  const translation = items.find(item => item.document_key === selectedKey && item.locale === locale) || items.find(item => item.document_id === doc?.id && item.locale === locale);
  const initial = translation ? { title: translation.title, intro: translation.content?.intro || "", sections: sectionsToText(translation.content?.sections || []) } : { title: template[locale].title, intro: template[locale].intro, sections: sectionsToText([...template[locale].sections]) };
  const currentVersions = useMemo(() => history.filter(item => item.document_key === selectedKey || item.document_id === doc?.id).sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0)), [history, selectedKey, doc?.id]);

  async function save(formData: FormData, publish = false) {
    setMessage("");
    const supabase = createClient();
    const title = String(formData.get("title") || "");
    const intro = String(formData.get("intro") || "");
    const sections = textToSections(String(formData.get("sections") || ""));
    const version = String(formData.get("version") || doc?.current_version || "1.0");
    const documentPayload = {
      id: doc?.id,
      document_key: template.key,
      slug: template.slug,
      document_type: template.type,
      title: locale === "fr" ? title : (doc?.title || template.fr.title),
      current_version: version,
      version,
      status: publish ? "published" : (doc?.status || "draft"),
      active: publish ? true : (doc?.active ?? true),
      requires_signature: Boolean(template.requiresSignature),
      signature_type: template.signatureType || null,
      published_at: publish ? new Date().toISOString() : doc?.published_at || null,
      updated_at: new Date().toISOString(),
    };
    const { data: savedDoc, error: docError } = await supabase.from("legal_documents").upsert(documentPayload, { onConflict: "document_key" }).select("*").single();
    if (docError) {
      setMessage(docError.message);
      return;
    }
    const content = { intro, sections };
    const translationPayload = { document_id: savedDoc.id, document_key: template.key, locale, title, content, active: true, version, updated_at: new Date().toISOString() };
    const { data: savedTranslation, error: translationError } = await supabase.from("legal_translations").upsert(translationPayload, { onConflict: "document_id,locale" }).select("*").single();
    if (translationError) {
      setMessage(translationError.message);
      return;
    }
    const { data: versionRow } = await supabase.from("legal_document_versions").insert({ document_id: savedDoc.id, document_key: template.key, locale, version, title, content, status: publish ? "published" : "draft", created_by: null }).select("*").single();
    setDocs([savedDoc, ...docs.filter(item => item.document_key !== template.key)]);
    setItems([savedTranslation, ...items.filter(item => !(item.document_id === savedDoc.id && item.locale === locale) && !(item.document_key === template.key && item.locale === locale))]);
    if (versionRow) setHistory([versionRow, ...history]);
    if (publish) fetch("/api/legal/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document_key: template.key, title, locale, version }) }).catch(() => null);
    setMessage(publish ? "Document publie et notification preparee." : "Document enregistre.");
  }

  async function unpublish() {
    if (!doc?.id) return setMessage("Enregistrez d'abord le document.");
    const { data, error } = await createClient().from("legal_documents").update({ status: "unpublished", active: false, updated_at: new Date().toISOString() }).eq("id", doc.id).select("*").single();
    if (error) setMessage(error.message);
    else {
      setDocs([data, ...docs.filter(item => item.id !== doc.id)]);
      setMessage("Document depublie.");
    }
  }

  async function restore(version: Row) {
    if (!doc?.id) return;
    const { data, error } = await createClient().from("legal_translations").upsert({ document_id: doc.id, document_key: template.key, locale: version.locale, title: version.title, content: version.content, version: version.version, active: true, updated_at: new Date().toISOString() }, { onConflict: "document_id,locale" }).select("*").single();
    if (error) setMessage(error.message);
    else {
      setItems([data, ...items.filter(item => !(item.document_id === doc.id && item.locale === version.locale))]);
      setLocale(version.locale);
      setMessage(`Version ${version.version} restauree.`);
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
    <aside className="h-fit rounded-2xl border bg-white p-4">
      <h2 className="mb-4 text-lg font-black">Documents</h2>
      <div className="grid gap-2">{legalTemplates.map(item => {
        const row = docs.find(d => d.document_key === item.key);
        return <button key={item.key} onClick={() => setSelectedKey(item.key)} className={`rounded-xl p-3 text-left ${selectedKey === item.key ? "bg-forest text-white" : "bg-slate-50 hover:bg-mint"}`}><b>{item.fr.title}</b><span className="mt-1 block text-xs opacity-70">{row?.status || "modele pre-rempli"} - v{row?.current_version || "1.0"}</span></button>;
      })}</div>
    </aside>
    <main className="grid gap-6">
      {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
      <form action={async formData => save(formData, false)} className="grid gap-5 rounded-2xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase text-leaf">{template.key}</p><h1 className="text-2xl font-black">{template[locale].title}</h1></div>
          <div className="rounded-full bg-slate-100 p-1 text-sm font-black"><button type="button" onClick={() => setLocale("fr")} className={`rounded-full px-4 py-2 ${locale === "fr" ? "bg-forest text-white" : "text-forest"}`}>Francais</button><button type="button" onClick={() => setLocale("en")} className={`rounded-full px-4 py-2 ${locale === "en" ? "bg-forest text-white" : "text-forest"}`}>English</button></div>
        </div>
        <label className="grid gap-2 text-sm font-bold">Version<input name="version" defaultValue={doc?.current_version || "1.0"} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Titre<input name="title" key={`${selectedKey}-${locale}-title`} defaultValue={initial.title} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Introduction<textarea name="intro" key={`${selectedKey}-${locale}-intro`} defaultValue={initial.intro} rows={3} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Sections <span className="font-normal text-slate-400">Format : titre sur une ligne, texte dessous, espace entre sections.</span><textarea name="sections" key={`${selectedKey}-${locale}-sections`} defaultValue={initial.sections} rows={18} className="admin-input font-mono text-sm" /></label>
        <div className="flex flex-wrap gap-3"><button className="btn-secondary" type="submit">Enregistrer</button><button className="btn-primary" type="button" onClick={event => save(new FormData(event.currentTarget.closest("form")!), true)}>Publier</button><button className="btn-secondary" type="button" onClick={unpublish}>Depublier</button></div>
      </form>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-black">Historique des versions</h2>
        <div className="mt-4 grid gap-3">{currentVersions.map(version => <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{version.title}</b><p className="text-sm text-slate-500">{version.locale?.toUpperCase()} - v{version.version} - {version.created_at ? new Date(version.created_at).toLocaleString("fr-FR") : ""}</p></div><button onClick={() => restore(version)} className="btn-secondary px-4 py-2">Restaurer</button></div>)}{!currentVersions.length && <p className="text-slate-400">Aucune version enregistree.</p>}</div>
      </section>
    </main>
  </div>;
}
