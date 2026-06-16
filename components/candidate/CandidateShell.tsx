"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AcademicCapIcon, ArrowRightStartOnRectangleIcon, ChatBubbleLeftRightIcon, ClipboardDocumentCheckIcon, DocumentTextIcon, HomeIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";

const links = [
  ["/candidat", "Tableau de bord", HomeIcon],
  ["/candidat/dossier", "Mon dossier", ClipboardDocumentCheckIcon],
  ["/candidat/test-ecrit", "Test ecrit", AcademicCapIcon],
  ["/candidat/entretien", "Entretien", VideoCameraIcon],
  ["/candidat/messages", "Messages", ChatBubbleLeftRightIcon],
  ["/candidat/contrats", "Mes contrats", DocumentTextIcon],
] as const;

export default function CandidateShell({ children, email }: { children: React.ReactNode; email: string }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/candidat");
    router.refresh();
  }
  return <div className="min-h-screen bg-slate-100">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/candidat" className="text-xl font-black text-forest">NutVita<span className="text-orange">Candidat</span></Link>
        <div className="flex items-center gap-4"><LanguageSwitcher compact /><span className="hidden text-sm text-slate-500 sm:block">{email}</span><button onClick={logout} className="flex items-center gap-2 text-sm font-bold text-forest"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[240px_1fr]">
      <nav className="h-fit rounded-2xl bg-forest p-4 text-white">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex gap-3 rounded-xl px-4 py-3 font-bold hover:bg-white/10"><Icon className="h-5" />{label}</Link>)}</nav>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
