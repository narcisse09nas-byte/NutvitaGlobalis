"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AcademicCapIcon,
  ArrowRightStartOnRectangleIcon,
  AtSymbolIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  CalculatorIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CreditCardIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  LockClosedIcon,
  NewspaperIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  StarIcon,
  UserGroupIcon,
  UserPlusIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const all = ["super_admin"];
const navGroups = [
  {title:"Pilotage", tone:"bg-white/10", links:[
    ["/admin", "Tableau de bord", Squares2X2Icon, null],
    ["/super-admin", "Espace Super admin", ShieldCheckIcon, all],
    ["/admin/dashboard-business", "Dashboard business", ChartBarIcon, [...all, "finance_admin"]],
  ]},
  {title:"Sante & clients", tone:"bg-emerald-500/12", links:[
    ["/admin/sante", "Administration sante", UserGroupIcon, [...all, "health_admin"]],
    ["/admin/salle-attente", "Salle d'attente", ExclamationTriangleIcon, [...all, "health_admin"]],
    ["/admin/croissance-enfant", "Croissance enfant", ExclamationTriangleIcon, [...all, "health_admin"]],
    ["/admin/teleconseils", "Teleconseils", ChatBubbleLeftRightIcon, [...all, "health_admin"]],
  ]},
  {title:"Finance", tone:"bg-orange/15", links:[
    ["/admin/offres", "Offres et prix", CreditCardIcon, [...all, "finance_admin"]],
    ["/admin/paiements", "Paiements", CreditCardIcon, [...all, "finance_admin"]],
    ["/admin/prestataires-paiements", "Paiements prestataires", CreditCardIcon, [...all, "finance_admin"]],
    ["/admin/paiements-partenaires", "PayPal partenaires", CreditCardIcon, [...all, "finance_admin"]],
    ["/admin/depenses", "Depenses", CalculatorIcon, [...all, "finance_admin"]],
    ["/admin/factures", "Factures", DocumentTextIcon, [...all, "finance_admin"]],
    ["/admin/taxes", "Taxes", CalculatorIcon, [...all, "finance_admin"]],
  ]},
  {title:"Recrutement", tone:"bg-sky-500/15", links:[
    ["/admin/recrutement", "Recrutement", UserPlusIcon, [...all, "recruitment_admin"]],
    ["/admin/recrutement/entretiens", "Entretiens", VideoCameraIcon, [...all, "recruitment_admin"]],
    ["/admin/recrutement/messages", "Messages candidats", ChatBubbleOvalLeftEllipsisIcon, [...all, "recruitment_admin"]],
    ["/admin/dieteticiens", "Partenaires", UserGroupIcon, [...all, "recruitment_admin"]],
  ]},
  {title:"Collaboration", tone:"bg-violet-500/15", links:[
    ["/admin/collaboration", "Collaboration", ChatBubbleOvalLeftEllipsisIcon, [...all, "health_admin", "recruitment_admin"]],
    ["/admin/appels", "Appels video", VideoCameraIcon, [...all, "health_admin", "recruitment_admin"]],
  ]},
  {title:"Gouvernance", tone:"bg-slate-400/15", links:[
    ["/admin/contrats", "Contrats", DocumentCheckIcon, all],
    ["/admin/juridique", "Juridique", DocumentTextIcon, all],
    ["/admin/utilisateurs-admin", "Administrateurs", ShieldCheckIcon, all],
    ["/admin/audit", "Audit", ShieldCheckIcon, all],
    ["/admin/personnel", "Personnel", UserGroupIcon, all],
    ["/admin/emails-systeme", "Emails systeme", AtSymbolIcon, all],
  ]},
  {title:"Contenus", tone:"bg-lime-500/15", links:[
    ["/admin/articles", "Articles", NewspaperIcon, [...all, "content_admin"]],
    ["/admin/formations", "Formations", AcademicCapIcon, [...all, "content_admin"]],
    ["/admin/accueil", "Pages du site", HomeIcon, [...all, "content_admin"]],
    ["/admin/ressources-premium", "Ressources premium", LockClosedIcon, [...all, "content_admin"]],
    ["/admin/temoignages", "Temoignages", StarIcon, [...all, "content_admin"]],
    ["/admin/newsletter", "Newsletter", EnvelopeIcon, [...all, "content_admin"]],
  ]},
] as const;

export default function AdminShell({ children, name }: { children: ReactNode; name: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("super_admin");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async result => {
      const user = result.data.user;
      if (!user) return;
      const { data: admin } = await supabase.from("admin_users").select("role").eq("id", user.id).maybeSingle();
      setRole(admin?.role || "super_admin");
    });
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.push("/admin");
    router.refresh();
  }

  const visibleGroups = navGroups.map(group=>({
    ...group,
    links:group.links.filter(([, , , roles]) => !roles || roles.includes(role as never)),
  })).filter(group=>group.links.length);

  return <div className="min-h-screen bg-slate-100">
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-forest p-6 pb-24 text-white transition lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="mb-9 flex items-center justify-between">
        <Link href="/admin" className="text-xl font-black">NutVita<span className="text-orange">Admin</span></Link>
        <button onClick={() => setOpen(false)} className="lg:hidden"><XMarkIcon className="h-6" /></button>
      </div>
      <nav className="grid gap-4">
        {visibleGroups.map(group=><section key={group.title} className={`rounded-2xl border border-white/10 p-3 ${group.tone}`}>
          <p className="mb-2 px-2 text-[11px] font-black uppercase tracking-widest text-white/45">{group.title}</p>
          <div className="grid gap-1">
            {group.links.map(([href, label, Icon]) => <Link onClick={() => setOpen(false)} key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${path === href ? "bg-white text-forest shadow-sm" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><Icon className="h-5 shrink-0" />{label}</Link>)}
          </div>
        </section>)}
      </nav>
      <button onClick={logout} className="mt-8 flex w-full items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-bold text-white/70"><ArrowRightStartOnRectangleIcon className="h-5" />Deconnexion</button>
    </aside>
    <div className="lg:pl-72">
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b bg-white px-5 md:px-8">
        <button onClick={() => setOpen(true)} className="lg:hidden"><Bars3Icon className="h-7" /></button>
        <div><p className="text-xs uppercase tracking-widest text-slate-400">Administration</p><p className="font-bold text-forest">{name}</p></div>
        <div className="flex items-center gap-3"><LanguageSwitcher compact /><Link href="/" target="_blank" className="text-sm font-bold text-leaf">Voir le site</Link></div>
      </header>
      <main className="p-5 md:p-8">{children}</main>
    </div>
  </div>;
}

