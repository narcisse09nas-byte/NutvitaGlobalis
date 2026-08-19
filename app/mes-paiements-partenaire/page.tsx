import Link from "next/link";
import { redirect } from "next/navigation";
import PartnerPaymentRegister from "@/components/partner/PartnerPaymentRegister";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function PartnerPaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mes-paiements-partenaire");

  const locale = await getCurrentLocale();
  const english = locale === "en";
  const { data: vendor } = await supabase
    .from("partner_vendor_registry")
    .select("id,vendor_number,full_name,partner_type")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: payments } = vendor
    ? await supabase
        .from("partner_service_payments")
        .select("*,partner_payment_comments(*)")
        .eq("partner_vendor_id", vendor.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const rows = payments || [];
  const totals = rows.reduce(
    (sum: { gross: number; due: number; paid: number }, row: Record<string, unknown>) => ({
      gross: sum.gross + Number(row.gross_revenue || 0),
      due: sum.due + Number(row.amount_due || 0),
      paid: sum.paid + Number(row.amount_paid || 0),
    }),
    { gross: 0, due: 0, paid: 0 },
  );

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link href="/" className="text-xl font-black text-forest">NutVita<span className="text-orange">Globalis</span></Link>
          <div className="flex items-center gap-3"><LanguageSwitcher compact /><span className="text-sm text-slate-500">{user.email}</span></div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-9">
        <Link href="/" className="btn-secondary">← {english ? "Main site" : "Page principale"}</Link>
        <div className="mt-7">
          <p className="text-xs font-black uppercase tracking-widest text-orange">
            Vendor {vendor?.vendor_number || (english ? "pending" : "en cours d’attribution")}
          </p>
          <h1 className="mt-2 text-4xl font-black text-forest">{english ? "My payment register" : "Registre de mes paiements"}</h1>
          <p className="mt-2 text-slate-500">
            {english ? "Only transactions associated with your vendor account are displayed." : "Seules les transactions associées à votre compte partenaire sont affichées."}
          </p>
        </div>
        {!vendor ? (
          <div className="mt-7 rounded-2xl border bg-white p-8 text-slate-500">
            {english ? "Your vendor number will be created when your integration is finalized." : "Votre numéro vendor sera créé lorsque votre intégration sera finalisée."}
          </div>
        ) : (
          <>
            <div className="my-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label={english ? "Generated revenue" : "Revenus générés"} value={totals.gross} />
              <Metric label={english ? "Amount due" : "Montant à payer"} value={totals.due} />
              <Metric label={english ? "Paid" : "Déjà payé"} value={totals.paid} />
              <Metric label={english ? "Balance" : "Reliquat"} value={Math.max(0, totals.due - totals.paid)} />
            </div>
            <PartnerPaymentRegister initial={rows} userId={user.id} />
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-2xl bg-forest p-6 text-white"><p className="text-sm text-white/65">{label}</p><p className="mt-2 text-3xl font-black">{value.toLocaleString("fr-FR")} XAF</p></article>;
}
