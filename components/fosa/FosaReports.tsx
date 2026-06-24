import { fosaModules } from "@/lib/fosa-modules";

type Row = Record<string, any>;

export default function FosaReports({ records, facilities }: { records: Row[]; facilities: Row[] }) {
  const validated = records.filter(row => row.status === "validated").length;
  const pending = records.filter(row => ["draft", "submitted", "verified"].includes(row.status)).length;
  const modules = fosaModules.filter(module => module.slug !== "reports").map(module => ({
    ...module,
    count: records.filter(row => row.module === module.slug).length,
    validated: records.filter(row => row.module === module.slug && row.status === "validated").length,
  })).filter(module => module.count);
  return <div className="grid gap-7">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Formations sanitaires", facilities.length],
      ["Enregistrements", records.length],
      ["Valides", validated],
      ["En cours", pending],
    ].map(([label, value]) => <article key={String(label)} className="rounded-lg border bg-white p-6"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-3 text-4xl font-black text-forest">{value}</p></article>)}</div>
    <section className="rounded-lg border bg-white p-6"><h2 className="text-2xl font-black">Activite par module</h2><div className="mt-5 grid gap-3">{modules.map(module => <div key={module.slug} className="grid gap-2 border-b pb-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-bold">{module.title}</p><p className="text-xs text-slate-500">{module.description}</p></div><span className="text-sm font-bold">{module.count} saisie(s)</span><span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-forest">{module.validated} validee(s)</span></div>)}{!modules.length && <p className="text-slate-400">Les indicateurs apparaitront apres les premieres saisies.</p>}</div></section>
    <section className="rounded-lg border bg-white p-6"><h2 className="text-2xl font-black">Repartition par FOSA</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{facilities.map(facility => { const scoped = records.filter(row => row.facility_id === facility.id); return <article key={facility.id} className="rounded-lg bg-slate-50 p-4"><p className="font-black">{facility.name}</p><p className="mt-1 text-sm text-slate-500">{scoped.length} enregistrement(s), dont {scoped.filter(row => row.status === "validated").length} valide(s).</p></article>; })}</div></section>
  </div>;
}
