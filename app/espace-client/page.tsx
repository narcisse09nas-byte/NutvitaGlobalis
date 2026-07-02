import Link from "next/link";
import ClientShell from "@/components/client/ClientShell";
import BookingSlots from "@/components/client/BookingSlots";
import InvoiceDownloadButton from "@/components/client/InvoiceDownloadButton";
import {getClientEntitlements,requireClient} from "@/lib/client";

export const metadata = { title: "Espace client" };

export default async function ClientHome({ searchParams }: { searchParams: Promise<{ paiement?: string; activation?: string }> }) {
  const params = await searchParams;
  const { supabase, user, profile } = await requireClient();
  const access=await getClientEntitlements(supabase,user.id);
  const [{ data: enrollments }, { data: bookings }, { data: subscriptions }, { data: invoices }, { data: payments }, { data: reports }, { data: notifications }, { count: measurements }] = await Promise.all([
    supabase.from("formation_enrollments").select("*, formations(title,image_url,moodle_url)").eq("client_id", user.id).order("enrolled_at", { ascending: false }),
    supabase.from("consultation_bookings").select("*, teleconseils(name,duration)").eq("client_id", user.id).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*, subscription_plans(name,service_type,tier), children(full_name)").eq("client_id", user.id).in("status", ["active","pending"]).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("client_id", user.id).order("issued_at", { ascending: false }).limit(10),
    supabase.from("payments").select("*").eq("client_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("health_reports").select("*").eq("client_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("client_notifications").select("*").eq("client_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("anthropometric_measurements").select("id", { count: "exact", head: true }).eq("client_id", user.id),
  ]);
  return <ClientShell email={user.email || ""}><div className="grid gap-8">
    {params.activation === "gratuite" && <p className="rounded-xl bg-mint p-4 font-bold text-forest">Service active gratuitement. Les paiements restent en stand-by pendant la finalisation juridique de NutVitaGlobalis.</p>}
    {params.paiement && <p className="rounded-xl bg-mint p-4 font-bold text-forest">Paiement recu. L'activation apparaitra ici apres confirmation.</p>}
    <div><h1 className="text-3xl font-black">Bonjour {profile?.full_name || user.user_metadata.full_name || ""}</h1><p className="mt-2 text-slate-500">Vos achats, services et documents NutVitaGlobalis.</p></div>
    <div className="grid gap-4 sm:grid-cols-4"><Metric label="Formations" value={enrollments?.length || 0}/><Metric label="Consultations" value={bookings?.length || 0}/><Metric label="Factures" value={invoices?.length || 0}/><Metric label="Mesures sante" value={measurements || 0}/></div>
    <Section title="Mes abonnements et beneficiaires">{subscriptions?.length ? subscriptions.map((item:any) => <Link key={item.id} href={item.subscription_plans?.service_type==="child_growth"?"/espace-client/croissance-enfant":"/espace-client/dossier"} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><b>{item.subscription_plans?.name||item.plan_id}</b><p className="mt-1 text-sm text-slate-500">{item.children?.full_name||"Moi-meme"} · {item.expires_at?`jusqu au ${new Date(item.expires_at).toLocaleDateString("fr-FR")}`:"activation en attente"}</p></div><span className="rounded-full bg-mint px-3 py-1 text-xs font-bold uppercase text-forest">{item.status}</span></Link>) : <Empty href="/espace-client/services" label="Choisir un service"/>}</Section>
    <Section title="Mes formations achetees">{enrollments?.length ? enrollments.map((item: any) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.formations?.title || "Formation"}</b><p className="mt-1 text-xs text-slate-500">Statut : {item.status}</p>{item.access_url && <a href={item.access_url} target="_blank" className="mt-3 inline-block font-bold text-leaf">Acceder a la formation</a>}</article>) : <Empty href="/espace-client/services?categorie=formations" label="Decouvrir les formations"/>}</Section>
    <Section title="Mes consultations reservees">{bookings?.length ? bookings.map((item: any) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>Pack {item.teleconseils?.name || "nutrition"}</b><p className="mt-1 text-sm">Statut : {item.status}</p>{item.scheduled_at ? <p className="mt-2 font-bold text-leaf">Creneau confirme : {new Date(item.scheduled_at).toLocaleString("fr-FR")}</p> : <BookingSlots bookingId={item.id} initial={item.preferred_slots || []}/>}</article>) : <Empty href="/espace-client/consultations" label="Reserver une consultation"/>}</Section>
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Mes paiements">{payments?.length ? payments.map((item: any) => <PaymentRow key={item.id} item={item}/>) : <p className="text-slate-400">Aucun paiement.</p>}</Section>
      <Section title="Mes factures">{invoices?.length ? invoices.map((item: any) => <InvoiceDownloadButton key={item.id} path={item.file_path} label={`${item.invoice_number} · ${Number(item.total_including_tax).toLocaleString("fr-FR")} ${item.currency}`}/>) : <p className="text-slate-400">Aucune facture.</p>}</Section>
      <Section title="Mes messages">{notifications?.length ? notifications.map((item: any) => <article key={item.id} className="rounded-xl bg-slate-50 p-4"><b>{item.title}</b><p className="mt-1 text-sm text-slate-600">{item.message}</p></article>) : <p className="text-slate-400">Aucun message.</p>}</Section>
      <Section title="Mes rapports nutritionnels">{reports?.length ? reports.map((item: any) => <Link key={item.id} href="/espace-client/analyse" className="block rounded-xl bg-slate-50 p-4 font-bold text-leaf">{item.title}</Link>) : <Empty href="/espace-client/analyse" label="Ouvrir les analyses"/>}</Section>
    </div>
    <div className="grid gap-5 md:grid-cols-2">{access.health&&<Link href="/espace-client/dossier" className="rounded-2xl bg-forest p-7 text-white"><h2 className="text-2xl font-black text-white">Mon suivi santé</h2><p className="mt-2 text-white/70">Mesures, graphiques, tendances et commentaires.</p></Link>}{access.childGrowth&&<Link href="/espace-client/croissance-enfant" className="rounded-2xl bg-mint p-7"><h2 className="text-2xl font-black">Croissance enfant</h2><p className="mt-2 text-slate-600">Suivi actif pour les enfants abonnés.</p></Link>}{access.teleconsultation&&<Link href="/espace-client/messages" className="rounded-2xl bg-orange/10 p-7"><h2 className="text-2xl font-black">Mon expert</h2><p className="mt-2 text-slate-600">Chat et appels vidéo inclus dans votre pack.</p></Link>}<Link href="/espace-client/profil" className="rounded-2xl border bg-white p-7"><h2 className="text-2xl font-black">Mon profil</h2><p className="mt-2 text-slate-500">Coordonnées et informations personnelles.</p></Link></div>
  </div></ClientShell>;
}

function PaymentRow({ item }: { item: any }) {
  const needsProof = item.provider === "manual" && item.status === "pending";
  return <article className="rounded-xl bg-slate-50 p-4 text-sm">
    <div className="flex flex-wrap justify-between gap-3">
      <span>{item.product_name || item.purchase_type}</span>
      <b>{Number(item.total_including_tax || item.amount).toLocaleString("fr-FR")} {item.currency} · {paymentStatusLabel(item)}</b>
    </div>
    {needsProof && <Link href={`/espace-client/paiements/${item.id}`} className="mt-3 inline-block font-bold text-leaf">
      {item.proof_submitted_at ? "Voir ou remplacer la preuve" : "Joindre la preuve de paiement"} →
    </Link>}
  </article>;
}
function paymentStatusLabel(item: any) {
  if (item.provider === "manual" && item.status === "pending") return item.proof_submitted_at ? "Preuve soumise" : "En attente de preuve";
  if (item.status === "succeeded") return "Valide";
  if (item.status === "failed") return "Refuse";
  if (item.status === "cancelled") return "Annule";
  return item.status;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-white p-6"><p className="text-3xl font-black text-forest">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border bg-white p-6"><h2 className="mb-4 text-xl font-black">{title}</h2><div className="grid gap-3">{children}</div></section>; }
function Empty({ href, label }: { href: string; label: string }) { return <Link href={href} className="font-bold text-leaf">{label} →</Link>; }
