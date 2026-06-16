import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";

function sum(rows: any[] | null | undefined, predicate: (row: any) => boolean) { return (rows || []).filter(predicate).reduce((total, row) => total + Number(row.total_including_tax || row.amount || 0), 0); }
function since(days: number) { const d = new Date(); d.setDate(d.getDate() - days); return d; }

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const now = new Date(), today = new Date(now.toISOString().slice(0, 10)), week = since(7), month = new Date(now.getFullYear(), now.getMonth(), 1), year = new Date(now.getFullYear(), 0, 1);
  const [{ data: payments }, { count: activeClients }, { count: inactiveClients }, { count: activePros }, { count: inactivePros }, { data: feedback }] = await Promise.all([
    supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(1000),
    supabase.from("client_profiles").select("id", { count: "exact", head: true }).gte("partner_access_expires_at", now.toISOString()),
    supabase.from("client_profiles").select("id", { count: "exact", head: true }).lt("partner_access_expires_at", now.toISOString()),
    supabase.from("dietitian_profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("dietitian_profiles").select("id", { count: "exact", head: true }).neq("status", "active"),
    supabase.from("customer_feedback").select("*").limit(500),
  ]);
  const succeeded = (payments || []).filter((p: any) => p.status === "succeeded" || p.payment_status === "paid");
  const avg = feedback?.length ? (feedback.reduce((s: number, x: any) => s + Number(x.rating || 0), 0) / feedback.length).toFixed(1) : "0";
  const cards = [
    ["Aujourd'hui", sum(succeeded, p => new Date(p.created_at || p.paid_at) >= today)],
    ["Cette semaine", sum(succeeded, p => new Date(p.created_at || p.paid_at) >= week)],
    ["Ce mois", sum(succeeded, p => new Date(p.created_at || p.paid_at) >= month)],
    ["Cette annee", sum(succeeded, p => new Date(p.created_at || p.paid_at) >= year)],
  ];
  const sales = ["formation", "consultation", "subscription"].map(type => [type, succeeded.filter((p: any) => p.purchase_type === type).length]);
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Dashboard business</h1><p className="mt-2 text-slate-500">Revenus, ventes, clients, professionnels, paiements et satisfaction.</p></div><div className="grid gap-4 md:grid-cols-4">{cards.map(([label, value]) => <Metric key={label as string} label={label as string} value={`${Number(value).toLocaleString("fr-FR")} USD`} />)}</div><div className="mt-6 grid gap-6 xl:grid-cols-3"><Panel title="Ventes">{sales.map(([label, value]) => <Bar key={label as string} label={label as string} value={Number(value)} max={Math.max(1, ...sales.map(([, v]) => Number(v)))} />)}</Panel><Panel title="Clients"><Metric label="Actifs" value={activeClients || 0} /><Metric label="Inactifs" value={inactiveClients || 0} /></Panel><Panel title="Professionnels"><Metric label="Dieteticiens actifs" value={activePros || 0} /><Metric label="Dieteticiens inactifs" value={inactivePros || 0} /></Panel><Panel title="Paiements"><Metric label="Reussis" value={succeeded.length} /><Metric label="Echoues" value={(payments || []).filter((p: any) => p.status === "failed").length} /><Metric label="En attente" value={(payments || []).filter((p: any) => p.status === "pending").length} /></Panel><Panel title="Satisfaction"><Metric label="Moyenne" value={`${avg}/5`} /><Metric label="Reponses" value={feedback?.length || 0} /></Panel></div></AdminShell>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-forest">{value}</p></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="grid gap-3">{children}</div></section>; }
function Bar({ label, value, max }: { label: string; value: number; max: number }) { return <div><div className="flex justify-between text-sm font-bold"><span>{label}</span><span>{value}</span></div><div className="mt-2 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-leaf" style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div></div>; }
