"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BuildingOffice2Icon, ChartBarIcon, ClipboardDocumentListIcon, HomeIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";

export default function FosaShell({ children, organization, member }: { children: ReactNode; organization: string; member: Record<string, any> }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [
    ["/fosa/espace", "Tableau de bord", HomeIcon],
    ["/fosa/module/reports", "Rapports", ChartBarIcon],
    ["/fosa/module/admissions", "Registres", ClipboardDocumentListIcon],
    ...(member.role === "organization_admin" ? [["/fosa/administration", "Administration", UserGroupIcon] as const] : []),
  ] as const;
  async function logout() {
    await createClient().auth.signOut();
    router.push("/fosa/connexion");
    router.refresh();
  }
  return <div className="min-h-screen bg-[#f2f7f6] lg:grid lg:grid-cols-[260px_1fr]">
    <aside className="bg-[#285f63] p-6 text-white">
      <Link href="/fosa/espace" className="flex items-center gap-3 text-xl font-black"><BuildingOffice2Icon className="h-7"/>NutVita FOSA</Link>
      <p className="mt-2 text-xs text-white/60">{organization}</p>
      <nav className="mt-8 grid gap-2">{links.map(([href,label,Icon])=><Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${pathname===href?"bg-white text-[#285f63]":"text-white/80 hover:bg-white/10"}`}><Icon className="h-5"/>{label}</Link>)}</nav>
      <button onClick={logout} className="mt-8 w-full rounded-xl border border-white/20 px-4 py-3 text-left text-sm font-bold">Deconnexion</button>
    </aside>
    <div><header className="border-b bg-white px-6 py-4"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">{member.role.replaceAll("_"," ")}</p><p className="font-black text-forest">{member.full_name}</p></header><main className="p-5 md:p-8">{children}</main></div>
  </div>;
}
