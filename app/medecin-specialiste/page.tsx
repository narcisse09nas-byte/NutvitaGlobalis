import Link from "next/link";
import MedicalShell from "@/components/medical/MedicalShell";
import { attachClientProfiles, requireSpecialist } from "@/lib/medical";
import { getCurrentLocale } from "@/lib/i18n-server";
import { ChatBubbleLeftRightIcon, CreditCardIcon, PhoneIcon, UserGroupIcon } from "@heroicons/react/24/outline";

// Mirrors app/partenaire/page.tsx exactly in structure (date-range filter, KPI row, recent
// register), reading medical_consultations/medical_specialists instead of
// partner_consultations/dietitian_profiles.
type Params = { from?: string; to?: string };
type Row = Record<string, any>;

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { supabase, user, profile } = await requireSpecialist();
  const english = (await getCurrentLocale()) === "en";
  const t = (fr: string, en: string) => english ? en : fr;

  let consultationQuery = supabase.from("medical_consultations").select("*").eq("specialist_id", profile.id).order("scheduled_at", { ascending: false });
  if (params.from) consultationQuery = consultationQuery.gte("scheduled_at", params.from);
  if (params.to) consultationQuery = consultationQuery.lte("scheduled_at", `${params.to}T23:59:59`);

  const [{ data: consultationsRaw }, { data: vendor }, { count: requested }] = await Promise.all([
    consultationQuery,
    supabase.from("partner_vendor_registry").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("medical_consultations").select("id", { count: "exact", head: true }).eq("specialist_id", profile.id).eq("status", "requested"),
  ]);
  const consultations = await attachClientProfiles(supabase, consultationsRaw || []);
  const { data: payments } = vendor ? await supabase.from("partner_service_payments").select("gross_revenue,amount_due,amount_paid").eq("partner_vendor_id", vendor.id) : { data: [] as Row[] };
  const totals = (payments || []).reduce((sum: { due: number; paid: number }, row: Row) => ({ due: sum.due + Number(row.amount_due || 0), paid: sum.paid + Number(row.amount_paid || 0) }), { due: 0, paid: 0 });
  const balance = Math.max(totals.due - totals.paid, 0);
  const patients = new Set((consultations || []).map((item: Row) => item.client_id)).size;

  return <MedicalShell email={user.email || ""}>
    <header className="mb-7"><p className="text-sm font-bold uppercase tracking-widest text-leaf">{t("Medecin specialiste actif", "Active specialist doctor")}</p><h1 className="mt-2 text-3xl font-black">{t("Bonjour", "Hello")} {profile.full_name}</h1><p className="mt-2 text-slate-500">{t("Votre activite clinique et votre collaboration avec NutVitaGlobalis.", "Your clinical activity and collaboration with NutVitaGlobalis.")}</p></header>
    <form className="mb-6 grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-[1fr_1fr_auto_auto]"><label className="grid gap-2 text-sm font-bold">{t("Debut", "From")}<input name="from" type="date" defaultValue={params.from || ""} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">{t("Fin", "To")}<input name="to" type="date" defaultValue={params.to || ""} className="admin-input" /></label><button className="btn-primary self-end">{t("Filtrer", "Filter")}</button><Link href="/medecin-specialiste" className="btn-secondary self-end">{t("Reinitialiser", "Reset")}</Link></form>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Metric label={t("Consultations", "Consultations")} value={consultations?.length || 0} icon={PhoneIcon} />
      <Metric label={t("Patients actifs", "Active patients")} value={patients} icon={UserGroupIcon} />
      <Metric label={t("Montant du", "Amount due")} value={`${totals.due.toLocaleString("fr-FR")} FCFA`} icon={CreditCardIcon} />
      <Metric label={t("Deja verse", "Already paid")} value={`${totals.paid.toLocaleString("fr-FR")} FCFA`} icon={CreditCardIcon} />
      <Metric label={t("En salle d'attente", "In waiting room")} value={requested || 0} icon={ChatBubbleLeftRightIcon} />
    </section>
    <p className="mt-2 text-xs text-slate-400">{t("Solde restant a verser", "Outstanding balance")} : {balance.toLocaleString("fr-FR")} FCFA</p>
    <section className="mt-7 rounded-2xl border bg-white p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">{t("Registre des consultations recentes", "Recent consultations register")}</h2><p className="text-sm text-slate-500">{t("La periode selectionnee s'applique au registre.", "The selected period applies to the register.")}</p></div><Link href="/medecin-specialiste/consultations" className="btn-primary">{t("Nouvelle consultation", "New consultation")}</Link></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{t("ID consultation", "Consultation ID")}</th><th className="p-3">{t("Date", "Date")}</th><th className="p-3">{t("Patient", "Patient")}</th><th className="p-3">{t("Motif", "Reason")}</th><th className="p-3">{t("Statut", "Status")}</th><th className="p-3">{t("Action", "Action")}</th></tr></thead><tbody>{(consultations || []).map((item: Row) => <tr key={item.id} className="border-t align-top"><td className="p-3 font-black text-forest">{item.consultation_code}</td><td className="p-3">{item.scheduled_at ? new Date(item.scheduled_at).toLocaleString(english ? "en-GB" : "fr-FR") : "—"}</td><td className="p-3 font-bold">{item.client_profiles?.full_name || item.client_profiles?.email || "—"}</td><td className="max-w-xs p-3">{item.chief_complaint || "—"}</td><td className="p-3">{item.status}</td><td className="p-3"><Link className="font-black text-leaf hover:underline" href={`/medecin-specialiste/consultations/${item.id}`}>{t("Voir la fiche", "View record")}</Link></td></tr>)}{!consultations?.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{t("Aucune consultation sur cette periode.", "No consultation in this period.")}</td></tr>}</tbody></table></div>
    </section>
  </MedicalShell>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return <article className="min-w-0 rounded-2xl border bg-white p-5"><Icon className="h-7 text-leaf" /><p className="mt-4 break-words text-2xl font-black text-forest">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></article>;
}
