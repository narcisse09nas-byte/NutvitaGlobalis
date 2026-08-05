"use client";
import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AppData = Record<string, unknown> & { id?: unknown; created_at?: unknown; updated_at?: unknown; submitted_at?: unknown };

export default function PromoterApplicationForm({ userId, email, initial, locked }: { userId: string; email: string; initial: AppData; locked: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<AppData>({ ...initial, email: initial.email || email, candidate_id: userId, recruitment_type: "promoter" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const documents = (data.documents || {}) as Record<string, Array<{ name: string; path: string }>>;

  function set(name: string, value: unknown) { setData({ ...data, [name]: value }); }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setMessage("Téléversement en cours…");
    const supabase = createClient(), added = [] as Array<{ name: string; path: string }>;
    for (const file of files) {
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
      const path = `${userId}/identity/${crypto.randomUUID()}-${safe}`;
      const { error } = await supabase.storage.from("recruitment-documents").upload(path, file);
      if (error) { setMessage(error.message); return; }
      added.push({ name: file.name, path });
    }
    set("documents", { ...documents, identity: [...(documents.identity || []), ...added] });
    setMessage("Fichier ajouté. Enregistrez le brouillon.");
  }

  async function openFile(path: string) {
    const { data, error } = await createClient().storage.from("recruitment-documents").createSignedUrl(path, 120);
    if (error) setMessage(error.message); else window.open(data.signedUrl, "_blank");
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true); setMessage("");
    const payload: AppData = { ...data, status: data.status || "started", recruitment_type: "promoter" };
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.submitted_at;
    const { error } = await createClient().from("recruitment_applications").upsert(payload, { onConflict: "candidate_id" });
    setSaving(false);
    setMessage(error ? error.message : "Brouillon enregistré.");
    if (!error) router.refresh();
  }

  async function submitFinal() {
    await save();
    if (!confirm("Soumettre définitivement votre dossier de promoteur ? Après cette action, il ne sera plus modifiable.")) return;
    const response = await fetch("/api/recruitment/submit", { method: "POST" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message); return; }
    router.push("/candidat?submitted=1");
    router.refresh();
  }

  if (locked) return <div className="rounded-2xl border bg-white p-7"><h2 className="text-2xl font-black">Dossier soumis</h2><p className="mt-3 text-slate-500">Votre dossier de promoteur n'est plus modifiable. NutVitaGlobalis vous contactera pour la suite du processus.</p></div>;

  return <form onSubmit={save} className="grid gap-8">
    <Section title="Vos informations">
      <Text name="full_name" label="Nom complet" value={data} set={set} required />
      <Text name="birth_date" label="Date de naissance" type="date" value={data} set={set} required />
      <Text name="country" label="Pays" value={data} set={set} required />
      <Text name="city" label="Ville" value={data} set={set} required />
      <Text name="whatsapp_phone" label="Téléphone WhatsApp" value={data} set={set} required />
      <Text name="email" label="Email" type="email" value={data} set={set} required />
    </Section>
    <Section title="Votre motivation">
      <label className="grid gap-2 text-sm font-bold md:col-span-2">Pourquoi souhaitez-vous devenir promoteur NutVitaGlobalis ? Décrivez votre réseau et votre motivation.
        <textarea className="admin-input" rows={5} value={String(data.professional_references || "")} onChange={e => set("professional_references", e.target.value)} required />
      </label>
    </Section>
    <Section title="Pièce d'identité">
      <div className="rounded-xl border bg-white p-4 md:col-span-2">
        <p className="font-bold">Pièce d'identité (pour la vérification avant versement de commissions)</p>
        <input className="mt-3 text-sm" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={upload} />
        <div className="mt-2 grid gap-1">{(documents.identity || []).map(file => <button type="button" onClick={() => openFile(file.path)} className="text-left text-xs font-bold text-leaf" key={file.path}>{file.name} ↗</button>)}</div>
      </div>
    </Section>
    <Section title="Déclarations">
      {[["declaration_accuracy", "Je certifie que les informations fournies sont exactes."], ["declaration_privacy", "J'accepte les conditions de confidentialité et du programme promoteurs."]].map(([name, label]) => <label key={name} className="flex gap-3 md:col-span-2"><input type="checkbox" required checked={Boolean(data[name])} onChange={e => set(name, e.target.checked)} className="mt-1 h-5 w-5" /><span>{label}</span></label>)}
    </Section>
    {message && <p className="rounded-xl bg-mint p-4 font-semibold text-forest">{message}</p>}
    <div className="flex flex-wrap gap-3">
      <button disabled={saving} className="btn-secondary" type="submit">{saving ? "Enregistrement…" : "Enregistrer en brouillon"}</button>
      <button type="button" onClick={submitFinal} className="btn-primary">Soumettre définitivement</button>
    </div>
  </form>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-slate-50 p-6"><h2 className="mb-5 text-2xl font-black">{title}</h2><div className="grid gap-5 md:grid-cols-2">{children}</div></section>; }
function Text({ name, label, value, set, type = "text", required = false }: { name: string; label: string; value: AppData; set: (n: string, v: unknown) => void; type?: string; required?: boolean }) { return <label className="grid gap-2 text-sm font-bold">{label}<input name={name} type={type} required={required} className="admin-input" value={String(value[name] || "")} onChange={e => set(name, e.target.value)} /></label>; }
