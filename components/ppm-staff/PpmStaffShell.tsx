"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRightStartOnRectangleIcon, HomeIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const links = [
  ["/mon-espace-ppm", "Mes actifs", HomeIcon],
  ["/mon-espace-ppm/mon-compte", "Mon compte", UserCircleIcon],
] as const;

export default function PpmStaffShell({ children, name }: { children: React.ReactNode; name: string }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/mon-espace-ppm/connexion");
    router.refresh();
  }
  return <div className="min-h-screen bg-slate-100">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link href="/mon-espace-ppm" className="text-xl font-black text-forest">Mon<span className="text-orange">Espace</span> PPM</Link>
        <div className="flex items-center gap-4"><span className="hidden text-sm text-slate-500 sm:block">{name}</span><button onClick={logout} className="flex items-center gap-2 text-sm font-bold"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-5xl gap-7 px-5 py-8 lg:grid-cols-[220px_1fr]">
      <nav className="self-stretch rounded-2xl bg-forest p-4 text-white">
        {links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex gap-3 rounded-xl px-4 py-3 font-bold hover:bg-white/10"><Icon className="h-5" />{label}</Link>)}
      </nav>
      <main className="min-w-0">{children}</main>
    </div>
  </div>;
}
