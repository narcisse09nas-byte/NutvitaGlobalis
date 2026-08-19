import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import PromoterCommissionSettings from "@/components/admin/PromoterCommissionSettings";
import { requireAdmin } from "@/lib/admin";

const cards = [
  ["Salle d'attente", "Candidatures et manifestations d'int\u00e9r\u00eat \u00e0 examiner.", "/admin/promoteurs/salle-attente"],
  ["Entretiens", "Planification, jury, visioconf\u00e9rence et \u00e9valuation.", "/admin/promoteurs/entretiens"],
  ["D\u00e9cisions et codes", "D\u00e9cision finale, int\u00e9gration et attribution du code promotionnel.", "/admin/promoteurs/decisions"],
  ["Paiements centralis\u00e9s", "Consultez et suivez les paiements des promoteurs dans Maximus.", "/maximus/finance/partner-payments"],
];

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const [{ count: waiting }, { count: active }, { data: settings }] = await Promise.all([
    supabase.from("recruitment_applications").select("*", { count: "exact", head: true }).eq("recruitment_type", "promoter").in("status", ["started", "submitted", "under_review", "incomplete", "preselected"]),
    supabase.from("promoter_profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("promoter_program_settings").select("commission_rate").eq("id", 1).maybeSingle(),
  ]);
  return (
    <AdminShell name={admin.full_name || admin.email}>
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-widest text-orange">Programme promoteurs</p>
        <h1 className="mt-2 text-4xl font-black">Administration des promoteurs</h1>
        <p className="mt-2 text-slate-500">Le recrutement et les codes promotionnels sont g\u00e9r\u00e9s ici. Les comptes et paiements partenaires sont centralis\u00e9s dans Maximus.</p>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[["En attente", waiting || 0], ["Promoteurs actifs", active || 0], ["Commission actuelle", `${Number(settings?.commission_rate || 3)} %`]].map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-forest">{value}</p></div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, text, href]) => (
          <Link key={href} href={href} className="rounded-2xl border bg-white p-6 transition hover:-translate-y-1 hover:border-leaf hover:shadow-lg">
            <h2 className="text-xl font-black text-forest">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p><p className="mt-5 font-bold text-leaf">Ouvrir {"\u2192"}</p>
          </Link>
        ))}
      </div>
      <div className="mt-7"><PromoterCommissionSettings initialRate={Number(settings?.commission_rate || 3)} /></div>
    </AdminShell>
  );
}
