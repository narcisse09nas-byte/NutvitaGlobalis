import MedicalShell from "@/components/medical/MedicalShell";
import PartnerPaymentRegister from "@/components/partner/PartnerPaymentRegister";
import { requireSpecialist } from "@/lib/medical";

// PartnerPaymentRegister is fully generic (keyed only on partner_vendor_registry.user_id, no
// dietitian-specific logic) so it's reused verbatim — same query shape as
// app/partenaire/finances/page.tsx. This gives the médecin their own dedicated route instead of
// the previous /mes-paiements-partenaire fallback.
export default async function Page() {
  const { supabase, user } = await requireSpecialist();
  const { data: vendor } = await supabase.from("partner_vendor_registry").select("id,vendor_number").eq("user_id", user.id).maybeSingle();
  const { data: payments } = vendor ? await supabase.from("partner_service_payments").select("*,partner_payment_comments(*)").eq("partner_vendor_id", vendor.id).order("created_at", { ascending: false }) : { data: [] };
  const rows = payments || [];
  const totals = rows.reduce((sum: { gross: number; due: number; paid: number }, row: any) => ({ gross: sum.gross + Number(row.gross_revenue || 0), due: sum.due + Number(row.amount_due || 0), paid: sum.paid + Number(row.amount_paid || 0) }), { gross: 0, due: 0, paid: 0 });
  return <MedicalShell email={user.email || ""}>
    <div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Vendor {vendor?.vendor_number || "en cours d'attribution"}</p><h1 className="mt-2 text-3xl font-black">Suivi de mes paiements</h1><p className="mt-2 text-slate-500">Registre centralise des revenus, montants dus, versements, preuves et echanges avec la Finance NutVitaGlobalis.</p></div>
    <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Revenus generes" value={totals.gross} /><Metric label="Montant a payer" value={totals.due} /><Metric label="Deja paye" value={totals.paid} /><Metric label="Reliquat" value={Math.max(0, totals.due - totals.paid)} /></div>
    <PartnerPaymentRegister initial={rows} userId={user.id} />
  </MedicalShell>;
}

function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-2xl bg-forest p-6 text-white"><p className="text-sm text-white/65">{label}</p><p className="mt-2 text-3xl font-black">{value.toLocaleString("fr-FR")} XAF</p></article>; }
