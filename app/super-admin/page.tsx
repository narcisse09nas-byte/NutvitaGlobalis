import Link from "next/link";
import { BuildingOffice2Icon, ChartBarIcon, ClipboardDocumentListIcon, CommandLineIcon, PresentationChartLineIcon, RectangleGroupIcon, ShieldCheckIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function SuperAdminPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from("admin_users").select("role").eq("id", admin.id).single();
  if (current?.role !== "super_admin") redirect("/admin?acces=refuse");
  const links = [
    { title: "Maximus", text: "Ouvrir le cockpit distinct de gestion interne et de pilotage du cabinet.", href: "/maximus", icon: CommandLineIcon, tone: "bg-forest text-white" },
    { title: "Manager", text: "Acceder a la console de direction et de supervision transversale.", href: "/manager", icon: RectangleGroupIcon, tone: "bg-rose-50 text-rose-700" },
    { title: "Project, Programme and Portfolio Management", text: "Piloter portefeuilles, programmes, projets, plans, risques, budgets, indicateurs et rapports.", href: "/op-management", icon: PresentationChartLineIcon, tone: "bg-blue-50 text-blue-700" },
    { title: "Survey", text: "Gerer les enquetes de securite alimentaire et nutrition.", href: "/surveys", icon: ClipboardDocumentListIcon, tone: "bg-lime-50 text-lime-800" },
    { title: "Administration NutriTrack", text: "Valider les organisations et administrer les acces a l application.", href: "/super-admin/nutritrack", icon: BuildingOffice2Icon, tone: "bg-cyan-50 text-cyan-700" },
    { title: "Interface nutritionniste", text: "Superviser les consultations et utiliser la fiche clinique avec attribution du professionnel responsable.", href: "/super-admin/nutritionniste", icon: ClipboardDocumentListIcon, tone: "bg-emerald-50 text-emerald-800" },
    { title: "Administrateurs NutVita", text: "Gerer les administrateurs globaux, leurs roles et leur historique.", href: "/admin/utilisateurs-admin", icon: ShieldCheckIcon, tone: "bg-slate-100 text-slate-700" },
    { title: "Tableau de bord", text: "Revenir au pilotage general de NutVitaGlobalis.", href: "/admin", icon: Squares2X2Icon, tone: "bg-emerald-50 text-emerald-700" },
    { title: "Dashboard business", text: "Consulter les principaux indicateurs de gestion.", href: "/admin/dashboard-business", icon: ChartBarIcon, tone: "bg-orange/10 text-orange" },
  ] as const;
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-8"><p className="text-xs font-black uppercase tracking-widest text-orange">Acces principal</p><h1 className="mt-2 text-3xl font-black">Espace Super admin</h1><p className="mt-2 text-slate-500">Accedez directement aux administrations specialisees sans alourdir davantage le menu principal.</p></div><div className="grid gap-5 md:grid-cols-2">{links.map(({ title, text, href, icon: Icon, tone }) => <Link href={href} key={href} className="rounded-lg border bg-white p-6 transition hover:border-leaf hover:shadow-soft"><span className={`grid h-12 w-12 place-items-center rounded-lg ${tone}`}><Icon className="h-6" /></span><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 leading-7 text-slate-500">{text}</p></Link>)}</div></AdminShell>;
}
