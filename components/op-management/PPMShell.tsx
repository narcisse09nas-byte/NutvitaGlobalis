"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightStartOnRectangleIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/op-management/NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { PPM_NAV_GROUPS } from "@/lib/ppm/navigation";

export type PPMBreadcrumb = { href: string; label: string };

export default function PPMShell({ children, name, breadcrumbs }: { children: ReactNode; name: string; breadcrumbs?: PPMBreadcrumb[] }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/connexion");
    router.refresh();
  }

  return <div className="min-h-screen bg-slate-100">
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-forest p-6 pb-24 text-white transition lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-9 flex items-center justify-between">
        <Link href="/op-management" className="text-xl font-black">NutVita<span className="text-orange">PPM</span></Link>
        <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="Fermer"><XMarkIcon className="h-6" /></button>
      </div>
      <nav className="grid gap-4">
        {PPM_NAV_GROUPS.map(group => <section key={group.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-white/45">{group.title}</p>
          <div className="grid gap-1">
            {group.items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${path === item.href ? "bg-white text-forest shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
              <item.icon className="h-5 shrink-0" />
              <span>{item.label}{item.description && <span className="mt-0.5 block text-xs font-medium text-white/50">{item.description}</span>}</span>
            </Link>)}
          </div>
        </section>)}
      </nav>
      <button onClick={logout} className="mt-8 flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white/70"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-3 border-b bg-white px-5 md:px-8">
        <button onClick={() => setOpen(true)} className="lg:hidden" aria-label="Ouvrir le menu"><Bars3Icon className="h-7" /></button>
        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            {breadcrumbs.map((crumb, index) => <span key={crumb.href} className="flex items-center gap-1">{index > 0 && <span>/</span>}<Link href={crumb.href} className="hover:text-forest">{crumb.label}</Link></span>)}
          </nav>}
          <p className="truncate text-xs uppercase tracking-widest text-slate-400">Project, Programme &amp; Portfolio Management</p>
          <p className="truncate font-bold text-forest">{name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3"><NotificationBell /><LanguageSwitcher compact /><Link href="/services" className="text-sm font-bold text-leaf">Voir les services</Link></div>
      </header>
      <main className="p-5 md:p-8">{children}</main>
    </div>
  </div>;
}
