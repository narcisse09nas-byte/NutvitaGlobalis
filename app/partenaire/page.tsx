import Link from "next/link";
import PartnerShell from "@/components/partner/PartnerShell";
import { requirePartner } from "@/lib/partner";
import { ChatBubbleLeftRightIcon, CreditCardIcon, PhoneIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export default async function Page() {
  const { supabase, user, profile } = await requirePartner();
  const now = new Date().toISOString();
  const [{ data: consultations }, { data: ledger }, { count: clients }, { data: calls }, { count: waiting }] = await Promise.all([
    supabase.from("partner_consultations").select("*").eq("partner_id", profile.id).order("scheduled_at", { ascending: false }),
    supabase.from("partner_ledger").select("*").eq("partner_id", profile.id).order("occurred_at", { ascending: false }),
    supabase.from("client_profiles").select("id", { count: "exact", head: true }).or(`created_by_partner_id.eq.${profile.id},assigned_partner_id.eq.${profile.id}`).gte("partner_access_expires_at", now),
    supabase.from("collaboration_calls").select("*").order("scheduled_at", { ascending: false }).limit(3),
    supabase.from("consultation_waiting_room").select("id", { count: "exact", head: true }).in("status", ["waiting", "partner_interested", "assigned_pending_partner"]),
  ]);
  const revenue = (ledger || []).filter((x: any) => ["approved", "paid"].includes(x.status)).reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);
  return <PartnerShell email={user.email || ""}><div className="mb-8"><p className="text-sm font-bold uppercase tracking-widest text-leaf">Partenaire actif</p><h1 className="mt-2 text-3xl font-black">Bonjour {profile.full_name}</h1><p className="mt-2 text-slate-500">Votre activite clinique et votre collaboration avec NutVitaGlobalis.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Consultations" value={consultations?.length || 0} icon={PhoneIcon} /><Metric label="Clients actifs" value={clients || 0} icon={UserGroupIcon} /><Metric label="Part a payer" value={`${revenue.toLocaleString("fr-FR")} FCFA`} icon={CreditCardIcon} /><Metric label="En salle d'attente" value={waiting || 0} icon={ChatBubbleLeftRightIcon} /></div><div className="mt-7 grid gap-6 xl:grid-cols-2"><Section title="Consultations recentes">{consultations?.slice(0, 5).map((item: any) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.reason || "Consultation nutritionnelle"}</b><p className="mt-1 text-sm text-slate-500">{new Date(item.scheduled_at).toLocaleString("fr-FR")} - {item.status} - {item.source}</p></div>)}</Section><Section title="Actions rapides"><Link className="btn-primary" href="/partenaire/salle-attente">Voir la salle d'attente</Link><Link className="btn-secondary" href="/partenaire/clients">Creer un client sur site</Link><Link className="btn-secondary" href="/partenaire/consultations">Creer une consultation</Link><Link className="btn-secondary" href="/partenaire/messages">Ecrire a l'equipe</Link><Link className="btn-secondary" href="/partenaire/appels">Demarrer un appel video</Link></Section></div></PartnerShell>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) { return <div className="rounded-2xl border bg-white p-5"><Icon className="h-7 text-leaf" /><p className="mt-4 text-2xl font-black text-forest">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="grid gap-3">{children}</div></section>; }
