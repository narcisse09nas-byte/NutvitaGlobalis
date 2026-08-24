import Link from "next/link";
import { notFound } from "next/navigation";
import MedicalShell from "@/components/medical/MedicalShell";
import PrintCardButton from "@/components/shared/PrintCardButton";
import { requireSpecialist } from "@/lib/medical";

type Row = Record<string, any>;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireSpecialist();
  const { data: item } = await supabase.from("medical_consultations").select("*").eq("id", id).eq("specialist_id", profile.id).maybeSingle();
  if (!item) notFound();
  const { data: patient } = await supabase.from("client_profiles").select("full_name,email").eq("id", item.client_id).maybeSingle();
  const documentLinks = await Promise.all((item.documents || []).map(async (doc: Row) => {
    const { data } = await supabase.storage.from("document-vault").createSignedUrl(doc.path, 600);
    return { name: doc.name, url: data?.signedUrl };
  }));

  return <MedicalShell email={user.email || ""}><div className="mx-auto max-w-5xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/medecin-specialiste/consultations" className="font-black text-leaf">← Retour au registre</Link><PrintCardButton label="Imprimer la fiche" /></div>
    <article className="rounded-3xl border bg-white p-6 shadow-sm sm:p-9">
      <header className="border-b pb-6">
        <p className="text-xs font-black uppercase tracking-[.2em] text-orange">Fiche de consultation medicale specialisee</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><h1 className="text-3xl font-black text-forest">{item.consultation_code}</h1><p className="text-sm text-slate-500">{item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("fr-FR") : "—"}</p></div>
      </header>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Patient" value={patient?.full_name || patient?.email} />
        <Info label="Mode" value={item.consultation_mode} />
        <Info label="Statut" value={item.status} />
      </section>
      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <Block title="Motif de consultation" value={item.chief_complaint} />
        <Block title="Anamnese" value={item.history} />
        <Block title="Examen clinique" value={item.examination} />
        <Block title="Evaluation / diagnostic" value={item.assessment} />
        <Block title="Plan de prise en charge" value={item.care_plan} />
        <Block title="Prescriptions" value={(item.prescriptions || []).map((p: Row) => [p.drug, p.dosage, p.instructions].filter(Boolean).join(" — ")).join("\n")} />
      </section>
      {!!documentLinks.length && <section className="mt-6 print:hidden"><h2 className="font-black text-forest">Documents</h2><div className="mt-3 flex flex-wrap gap-3">{documentLinks.map((doc, index) => doc.url && <a key={index} href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-leaf">{doc.name}</a>)}</div></section>}
    </article>
  </div></MedicalShell>;
}

function Info({ label, value }: { label: string; value: any }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 break-words font-bold text-forest">{String(value || "—")}</p></div>; }
function Block({ title, value }: { title: string; value: any }) { return <div className="rounded-2xl border p-5"><h2 className="font-black text-forest">{title}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{String(value || "—")}</p></div>; }
