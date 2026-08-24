"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowRightStartOnRectangleIcon, ChatBubbleLeftRightIcon, ClockIcon, CreditCardIcon, HomeIcon, PhoneIcon, UserGroupIcon, VideoCameraIcon, PencilSquareIcon } from "@heroicons/react/24/outline";

// Mirrors components/partner/PartnerShell.tsx structure exactly (same header/logout/language
// layout) so the médecin workspace matches the nutritionist workspace's UX 1:1, while staying a
// fully separate component/route tree.
const links = [
  ["/medecin-specialiste", "Tableau de bord", HomeIcon],
  ["/medecin-specialiste/salle-attente", "Salle d'attente", ClockIcon],
  ["/medecin-specialiste/patients", "Mes patients", UserGroupIcon],
  ["/medecin-specialiste/consultations", "Consultations", PhoneIcon],
  ["/medecin-specialiste/finances", "Paiements", CreditCardIcon],
  ["/medecin-specialiste/messages", "Messages", ChatBubbleLeftRightIcon],
  ["/medecin-specialiste/appels", "Appels video", VideoCameraIcon],
  ["/signatures", "Ma signature", PencilSquareIcon],
] as const;

export default function MedicalShell({ children, email }: { children: React.ReactNode; email: string }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }
  return <div className="min-h-screen bg-slate-100"><header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5"><Link href="/medecin-specialiste" className="text-xl font-black text-forest">NutVita<span className="text-orange">Medecin</span></Link><div className="flex items-center gap-4"><LanguageSwitcher compact /><span className="hidden text-sm text-slate-500 sm:block">{email}</span><button onClick={logout} className="flex items-center gap-2 text-sm font-bold"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button></div></div></header><div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[250px_1fr]"><nav className="self-stretch rounded-2xl bg-forest p-4 text-white">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex gap-3 rounded-xl px-4 py-3 font-bold hover:bg-white/10"><Icon className="h-5" />{label}</Link>)}</nav><main className="min-w-0">{children}</main></div></div>;
}
