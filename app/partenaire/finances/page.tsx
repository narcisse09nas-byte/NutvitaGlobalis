import Link from "next/link";
import PartnerShell from "@/components/partner/PartnerShell";
import { requirePartner } from "@/lib/partner";

export default async function Page({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; status?: string }> }) {
  const params = await searchParams;
  const { supabase, user, profile } = await requirePartner();
  let ledgerQuery = supabase.from("partner_ledger").select("*").eq("partner_id", profile.id).order("occurred_at", { ascending: false });
  let payoutQuery = supabase.from("partner_payouts").select("*").eq("partner_id", profile.id).order("created_at", { ascending: false });
  if (params.from) {
    ledgerQuery = ledgerQuery.gte("occurred_at", params.from);
    payoutQuery = payoutQuery.gte("created_at", params.from);
  }
  if (params.to) {
    ledgerQuery = ledgerQuery.lte("occurred_at", `${params.to}T23:59:59`);
    payoutQuery = payoutQuery.lte("created_at", `${params.to}T23:59:59`);
  }
  if (params.status) ledgerQuery = ledgerQuery.eq("status", params.status);
  const [{ data }, { data: payouts }] = await Promise.all([ledgerQuery, payoutQuery]);
  const generated = (data || []).filter((x: any) => ["earning", "adjustment"].includes(x.entry_type) && ["approved", "paid"].includes(x.status)).reduce((s: number, x: any) => s + Number(x.amount || 0) * 2, 0);
  const due = (data || []).filter((x: any) => ["earning", "adjustment"].includes(x.entry_type) && x.status === "approved").reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const paid = (payouts || []).filter((x: any) => x.status === "paid").reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  return <PartnerShell email={user.email || ""}>
    <div className="mb-7"><h1 className="text-3xl font-black">Paiements et revenus</h1><p className="mt-2 text-slate-500">Part partenaire calculee a 50% des revenus generes et versements NutVitaGlobalis.</p></div>
    <form className="mb-6 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-4"><label className="grid gap-2 text-sm font-bold">Debut<input name="from" type="date" defaultValue={params.from || ""} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Fin<input name="to" type="date" defaultValue={params.to || ""} className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={params.status || ""} className="admin-input"><option value="">Tous</option><option value="pending">En attente</option><option value="approved">A payer</option><option value="paid">Paye</option><option value="cancelled">Annule</option></select></label><div className="flex items-end gap-2"><button className="btn-primary">Filtrer</button><Link href="/partenaire/finances" className="btn-secondary">Reset</Link></div></form>
    <div className="mb-6 grid gap-4 md:grid-cols-3"><Metric label="Revenus generes" value={generated} /><Metric label="A payer au partenaire" value={due} /><Metric label="Deja paye par NutVita" value={paid} /></div>
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Type</th><th className="p-4">Statut</th><th className="p-4 text-right">Part partenaire</th><th className="p-4 text-right">Revenu brut estime</th></tr></thead><tbody>{data?.map((x: any) => <tr key={x.id} className="border-t"><td className="p-4">{new Date(x.occurred_at).toLocaleDateString("fr-FR")}</td><td className="p-4">{x.description}</td><td className="p-4">{x.entry_type}</td><td className="p-4">{x.status}</td><td className="p-4 text-right font-bold">{Number(x.amount).toLocaleString("fr-FR")} {x.currency}</td><td className="p-4 text-right">{(Number(x.amount) * 2).toLocaleString("fr-FR")} {x.currency}</td></tr>)}</tbody></table></div>
    <div className="mt-6 overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="p-4">Versement</th><th className="p-4">Periode</th><th className="p-4">Canal</th><th className="p-4">Statut</th><th className="p-4 text-right">Montant</th></tr></thead><tbody>{payouts?.map((x: any) => <tr key={x.id} className="border-t"><td className="p-4">{new Date(x.created_at).toLocaleDateString("fr-FR")}</td><td className="p-4">{[x.period_start, x.period_end].filter(Boolean).join(" - ") || "-"}</td><td className="p-4">{x.provider}</td><td className="p-4">{x.status}</td><td className="p-4 text-right font-bold">{Number(x.amount).toLocaleString("fr-FR")} {x.currency}</td></tr>)}</tbody></table></div>
  </PartnerShell>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-forest p-6 text-white"><p className="text-sm text-white/60">{label}</p><p className="mt-2 text-3xl font-black text-white">{value.toLocaleString("fr-FR")} FCFA</p></div>;
}
