"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getFosaFormDefinition, type FosaField } from "@/lib/fosa-form-definitions";

type Row = Record<string, any>;

function Field({ field, values, setValue }: { field: FosaField; values: Record<string, string>; setValue: (name: string, value: string) => void }) {
  if (field.showWhen && !field.showWhen.values.includes(values[field.showWhen.field] || "")) return null;
  const common = {
    name: field.name,
    required: field.required,
    value: values[field.name] || "",
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValue(field.name, event.target.value),
    className: "admin-input",
  };
  return <label className={`grid gap-2 text-sm font-bold ${field.type === "textarea" ? "md:col-span-2" : ""}`}>
    <span>{field.label}{field.required && <span className="text-orange"> *</span>}</span>
    {field.type === "textarea"
      ? <textarea {...common} rows={4} placeholder={field.placeholder} />
      : field.type === "select"
        ? <select {...common}><option value="">Selectionner</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>
        : <input {...common} type={field.type || "text"} step={field.step} min={field.min} placeholder={field.placeholder} />}
    {field.help && <small className="font-normal leading-5 text-slate-500">{field.help}</small>}
  </label>;
}

export default function FosaRecordManager({ module, organizationId, member, facilities, initial }: { module: { slug: string; title: string; description: string }; organizationId: string; member: Row; facilities: Row[]; initial: Row[] }) {
  const definition = getFosaFormDefinition(module.slug);
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState("");
  const canCreate = ["organization_admin", "creator"].includes(member.role);
  const summaryFields = useMemo(() => definition?.sections.flatMap(section => section.fields).slice(0, 8) || [], [definition]);

  function setValue(name: string, value: string) {
    setValues(current => ({ ...current, [name]: value }));
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!definition) return;
    const title = values[definition.titleField] || module.title;
    const reference = `${definition.referencePrefix}-${Date.now().toString().slice(-8)}`;
    const summary = summaryFields.map(field => values[field.name] ? `${field.label}: ${values[field.name]}` : "").filter(Boolean).join(" | ");
    const payload = {
      facility_id: facilityId,
      module: module.slug,
      organization_id: organizationId,
      created_by: member.user_id,
      title,
      reference,
      summary,
      payload: values,
    };
    const query = editingId
      ? createClient().from("fosa_records").update({ facility_id: facilityId, title, summary, payload: values }).eq("id", editingId)
      : createClient().from("fosa_records").insert(payload);
    const { data, error } = await query.select().single();
    if (error) setMessage(error.message);
    else {
      setRows(editingId ? rows.map(row => row.id === editingId ? data : row) : [data, ...rows]);
      setValues({});
      setFacilityId("");
      setEditingId(null);
      event.currentTarget.reset();
      setMessage(editingId ? "Brouillon mis a jour." : "Enregistrement specialise cree en brouillon.");
    }
  }

  function edit(row: Row) {
    setEditingId(row.id);
    setFacilityId(row.facility_id);
    setValues(Object.fromEntries(Object.entries(row.payload || {}).map(([key, value]) => [key, String(value ?? "")])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function transition(row: Row, status: string) {
    const changes: Row = { status };
    if (status === "submitted") changes.submitted_at = new Date().toISOString();
    if (status === "verified") { changes.verified_at = new Date().toISOString(); changes.verified_by = member.user_id; }
    if (status === "validated") { changes.validated_at = new Date().toISOString(); changes.validated_by = member.user_id; }
    const { data, error } = await createClient().from("fosa_records").update(changes).eq("id", row.id).select().single();
    if (error) setMessage(error.message);
    else setRows(rows.map(item => item.id === row.id ? data : item));
  }

  if (!definition) return <div className="rounded-2xl border bg-white p-8"><h2 className="text-xl font-black">Tableau de consultation</h2><p className="mt-2 text-slate-500">Ce module consolide les donnees des autres formulaires et ne necessite pas de saisie directe.</p></div>;

  return <div className="grid gap-7">
    {canCreate && <form onSubmit={create} className="grid gap-6 rounded-2xl border bg-white p-5 md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold md:col-span-2">Formation sanitaire
          <select name="facility_id" required className="admin-input" value={facilityId} onChange={event => setFacilityId(event.target.value)}><option value="">Selectionner une FOSA</option>{facilities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </label>
      </div>
      {definition.sections.map(section => <fieldset key={section.title} className="rounded-xl border border-slate-200 p-4 md:p-5">
        <legend className="px-2 text-lg font-black text-forest">{section.title}</legend>
        {section.description && <p className="mb-4 text-sm leading-6 text-slate-500">{section.description}</p>}
        <div className="grid gap-4 md:grid-cols-2">{section.fields.map(field => <Field key={field.name} field={field} values={values} setValue={setValue} />)}</div>
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><button className="btn-primary justify-self-start">{editingId ? "Mettre a jour le brouillon" : "Enregistrer le brouillon"}</button>{editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setFacilityId(""); setValues({}); }}>Annuler la modification</button>}</div>
    </form>}
    {message && <p className="rounded-xl bg-mint p-4 font-bold text-forest">{message}</p>}
    <div className="grid gap-3">{rows.map(row => {
      const open = expanded === row.id;
      const payload = (row.payload || {}) as Record<string, unknown>;
      return <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap justify-between gap-4">
          <div><p className="text-xs font-bold uppercase text-leaf">{facilities.find(item => item.id === row.facility_id)?.name || "FOSA"} - {row.reference}</p><h2 className="mt-1 text-lg font-black">{row.title}</h2><p className="mt-2 text-sm text-slate-500">{row.summary || "Aucun resume."}</p></div>
          <span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{row.status}</span>
        </div>
        <button type="button" onClick={() => setExpanded(open ? null : row.id)} className="mt-4 text-sm font-bold text-leaf">{open ? "Masquer les details" : "Voir le formulaire complet"}</button>
        {open && <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">{definition.sections.flatMap(section => section.fields).map(field => payload[field.name] !== undefined && payload[field.name] !== "" ? <div key={field.name}><dt className="text-xs font-bold uppercase text-slate-400">{field.label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{String(payload[field.name])}</dd></div> : null)}</dl>}
        <div className="mt-4 flex flex-wrap gap-2">
          {row.created_by === member.user_id && row.status === "draft" && <button onClick={() => edit(row)} className="rounded-full border px-4 py-2 text-sm font-bold">Modifier</button>}
          {row.created_by === member.user_id && row.status === "draft" && <button onClick={() => transition(row, "submitted")} className="btn-secondary px-4 py-2">Soumettre</button>}
          {["organization_admin", "verifier"].includes(member.role) && row.status === "submitted" && <button onClick={() => transition(row, "verified")} className="btn-primary px-4 py-2">Verifier</button>}
          {["organization_admin", "validator"].includes(member.role) && row.status === "verified" && <button onClick={() => transition(row, "validated")} className="btn-primary px-4 py-2">Valider</button>}
        </div>
      </article>;
    })}{!rows.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-400">Aucun enregistrement dans ce module.</p>}</div>
  </div>;
}
