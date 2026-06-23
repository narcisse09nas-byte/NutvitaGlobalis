import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CheckoutForm from "@/components/checkout/CheckoutForm";
import TeleconsultationConsent from "@/components/client/TeleconsultationConsent";
import { formatUsd } from "@/lib/currency";
import { createClient } from "@/lib/supabase/server";
import { priceBreakdown } from "@/lib/taxes";

export const metadata = { title: "Paiement securise" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string; child_id?: string; paiement?: string }> }) {
  const params = await searchParams;
  const type = params.type;
  const id = params.id;
  const childId = params.child_id;
  if (!id || !type || !["subscription", "formation", "consultation"].includes(type)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const returnUrl = `/checkout?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}${childId ? `&child_id=${encodeURIComponent(childId)}` : ""}`;
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(returnUrl)}`);

  const { data: profile } = await supabase.from("client_profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) redirect(`/inscription?redirect=${encodeURIComponent(returnUrl)}`);

  let product: { name: string; priceXof: number } | null = null;
  let teleconsultationConsent = false;

  if (type === "subscription") {
    const { data } = await supabase.from("subscription_plans").select("name,amount,price_excluding_tax").eq("id", id).eq("active", true).single();
    if (data) product = { name: data.name, priceXof: Number(data.price_excluding_tax ?? data.amount) };
  }

  if (type === "formation") {
    const { data } = await supabase.from("formations").select("title,price").eq("id", id).eq("status", "published").single();
    if (data) product = { name: data.title, priceXof: Number(data.price || 50000) };
  }

  if (type === "consultation") {
    const [{ data }, { data: previous }, { data: consent }] = await Promise.all([
      supabase.from("teleconseils").select("name,price").eq("id", id).eq("status", "active").single(),
      supabase.from("consultation_bookings").select("id").eq("client_id", user.id).eq("teleconseil_id", id).limit(1).maybeSingle(),
      supabase.from("user_consents").select("accepted").eq("user_id", user.id).eq("consent_type", "teleconsultation").eq("accepted", true).maybeSingle(),
    ]);
    teleconsultationConsent = Boolean(consent?.accepted);
    if (data) product = { name: `${previous ? "Renouvellement " : ""}Pack ${data.name} - 1 an`, priceXof: Number(data.price || 15000) };
  }

  if (!product) notFound();

  const totals = priceBreakdown(0, 0);

  return <main className="min-h-screen bg-slate-100 py-12">
    <div className="container-site max-w-4xl">
      <Link href="/" className="font-bold text-leaf">Retour au site</Link>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl bg-white p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-leaf">Commande</p>
          <h1 className="mt-3 text-3xl font-black">{product.name}</h1>
          <div className="mt-7 grid gap-3 border-y py-6">
            <Line label="Prix temporaire" value="Gratuit" />
            <Line label="Taxe" value={formatUsd(totals.taxAmount)} />
            <Line label="Total actuel" value={formatUsd(totals.totalIncludingTax)} strong />
          </div>
          {type === "consultation" && <>
            <p className="mt-5 rounded-xl bg-mint p-4 text-sm text-forest"><b>Validite : 1 an renouvelable.</b> Chat securise, suivi personnalise et teleconsultations video avec un expert inclus selon le pack choisi.</p>
            <TeleconsultationConsent userId={user.id} accepted={teleconsultationConsent} />
          </>}
          <div className="mt-6">
            <h2 className="font-black">Informations client</h2>
            <p className="mt-2 text-sm text-slate-600">{profile.full_name}<br />{user.email}<br />{profile.whatsapp_phone || profile.phone}<br />{[profile.city, profile.country].filter(Boolean).join(", ")}</p>
          </div>
          {params.paiement === "annule" && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Le paiement a ete annule.</p>}
        </section>
        <aside className="h-fit rounded-3xl bg-white p-7">
          <CheckoutForm type={type as any} id={id} childId={childId} disabled={type === "consultation" && !teleconsultationConsent} />
           <p className="mt-5 text-xs leading-5 text-slate-400">Activation gratuite temporaire pendant la mise en place des documents juridiques et des services de paiement. Les conditions commerciales definitives seront publiees avant toute facturation.</p>
        </aside>
      </div>
    </div>
  </main>;
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-xl font-black text-forest" : "text-sm"}`}><span>{label}</span><b>{value}</b></div>;
}
