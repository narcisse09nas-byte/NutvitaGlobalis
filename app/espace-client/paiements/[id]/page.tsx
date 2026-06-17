import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ManualPaymentProof from "@/components/client/ManualPaymentProof";
import { createClient } from "@/lib/supabase/server";

export default async function ManualPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/espace-client/paiements/${id}`)}`);
  const { data: payment } = await supabase.from("payments").select("*").eq("id", id).eq("client_id", user.id).maybeSingle();
  if (!payment || payment.provider !== "manual") notFound();
  const { data: profile } = await supabase.from("client_profiles").select("preferred_language").eq("id", user.id).maybeSingle();
  const { data: accounts } = await supabase.from("payment_accounts").select("*").eq("method", payment.manual_method).eq("active", true).order("sort_order");
  const en = profile?.preferred_language === "en";
  return <main className="min-h-screen bg-slate-100 py-10">
    <div className="container-site max-w-4xl">
      <Link href="/espace-client" className="font-bold text-leaf">Retour a mon espace</Link>
      <section className="mt-6 rounded-3xl bg-white p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-leaf">Paiement en attente</p>
        <h1 className="mt-3 text-3xl font-black">{payment.product_name || "Service NutVitaGlobalis"}</h1>
        <div className="mt-6 grid gap-2 rounded-2xl bg-slate-50 p-5 text-sm">
          <Line label="Reference obligatoire" value={payment.checkout_reference} strong />
          <Line label="Montant TTC" value={`${Number(payment.total_including_tax || payment.amount).toLocaleString("fr-FR")} ${payment.currency}`} />
          <Line label="Mode" value={payment.manual_method === "bank_transfer" ? "Virement bancaire" : "Mobile Money"} />
          <Line label="Statut" value={payment.status} />
        </div>
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{en ? "Use the NutVitaGlobalis reference exactly in the payment message or bank transfer description. Your access will be activated after verification by the team." : "Indiquez exactement la reference NutVitaGlobalis dans le motif ou message du paiement. Votre acces sera active apres verification par l equipe."}</p>
        <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{en ? "You may upload the receipt here, or send it from your account email to contact@nutvitaglobalis.com with the payment reference." : "Vous pouvez televerser le recu ici, ou l envoyer depuis l email de votre compte a contact@nutvitaglobalis.com avec la reference de paiement."}</p>
      </section>
      <section className="mt-6 grid gap-4">
        <h2 className="text-2xl font-black">Comptes de paiement disponibles</h2>
        {accounts?.length ? accounts.map(account => <article key={account.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-xl font-black">{account.label}</h3><p className="mt-1 text-sm text-slate-500">{account.provider_name}</p></div><b className="text-forest">{account.currency}</b></div>
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <Line label="Titulaire" value={account.account_name} />
            <Line label="Numero / Compte" value={account.account_number} />
            {account.bank_name && <Line label="Banque" value={account.bank_name} />}
            {account.iban && <Line label="IBAN / RIB" value={account.iban} />}
            {account.swift_bic && <Line label="SWIFT / BIC" value={account.swift_bic} />}
          </div>
          {account.instructions && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{account.instructions}</p>}
        </article>) : <p className="rounded-2xl bg-white p-6 text-slate-500">Aucun compte actif pour ce mode. Contactez NutVitaGlobalis.</p>}
      </section>
      <ManualPaymentProof paymentId={payment.id} userId={user.id} alreadySubmitted={Boolean(payment.proof_submitted_at)} />
    </div>
  </main>;
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between gap-4 ${strong ? "text-lg font-black text-forest" : ""}`}><span>{label}</span><b className="text-right">{value}</b></div>;
}
