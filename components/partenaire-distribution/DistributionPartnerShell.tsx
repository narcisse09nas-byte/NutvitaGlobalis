"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightStartOnRectangleIcon, BuildingOffice2Icon, ClipboardDocumentListIcon, DocumentTextIcon, HomeIcon, ReceiptPercentIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const links = [
  ["/partenaire-distribution", "Tableau de bord", HomeIcon],
  ["/partenaire-distribution/bons-de-commande", "Bons de commande", ClipboardDocumentListIcon],
  ["/partenaire-distribution/bons-de-livraison", "Bons de livraison", DocumentTextIcon],
  ["/partenaire-distribution/factures", "Factures", ReceiptPercentIcon],
  ["/partenaire-distribution/profil", "Mon profil", UserCircleIcon],
] as const;

export default function DistributionPartnerShell({ children, name, siteNames }: { children: React.ReactNode; name: string; siteNames: string[] }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/partenaire-distribution/connexion");
    router.refresh();
  }
  return <div className="min-h-screen bg-slate-100">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/partenaire-distribution" className="text-xl font-black text-forest">NutVita<span className="text-orange">Distribution</span></Link>
        <div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:block">{name}</span><button onClick={logout} className="flex items-center gap-2 text-sm font-bold"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[250px_1fr]">
      <nav className="self-stretch rounded-2xl bg-forest p-4 text-white">
        {links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex gap-3 rounded-xl px-4 py-3 font-bold hover:bg-white/10"><Icon className="h-5" />{label}</Link>)}
        {!!siteNames.length && <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs"><p className="flex items-center gap-2 font-black uppercase tracking-wide text-white/60"><BuildingOffice2Icon className="h-4" />Ecole(s)</p><p className="mt-1 text-white/85">{siteNames.join(", ")}</p></div>}
      </nav>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
