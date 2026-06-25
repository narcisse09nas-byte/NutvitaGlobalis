import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BanknotesIcon, BriefcaseIcon, BuildingOffice2Icon, ChartBarIcon, ClipboardDocumentListIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { requireAdmin } from '@/lib/admin';

export const metadata = { title: 'Maximus | NutVitaGlobalis' };

export default async function MaximusPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');
  const modules = [
    ['Pilotage general', 'Indicateurs, activite et supervision globale du cabinet.', '/admin/dashboard-business', ChartBarIcon],
    ['Ressources humaines', 'Recrutement, partenaires, equipes et organisation.', '/admin/recrutement', UserGroupIcon],
    ['Finance', 'Paiements, depenses, factures, taxes et controles.', '/admin/paiements', BanknotesIcon],
    ['Operations et projets', 'Planification, execution, budgets et rapports operationnels.', '/op-management', BriefcaseIcon],
    ['Enquetes', 'Planification et gestion des enquetes nutritionnelles et alimentaires.', '/surveys', ClipboardDocumentListIcon],
    ['Services specialises', 'Acces aux administrations NutriTrack et futures applications.', '/super-admin', BuildingOffice2Icon],
  ] as const;
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-forest px-6 py-8 text-white"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-orange">NutVitaGlobalis</p><h1 className="mt-2 text-4xl font-black text-white">Maximus</h1><p className="mt-2 text-white/70">Gestion interne et pilotage du cabinet.</p></div><Link href="/super-admin" className="rounded-md border border-white/25 px-4 py-2 text-sm font-bold">Espace Super admin</Link></div></div></header>
      <section className="mx-auto grid max-w-7xl gap-5 p-6 md:grid-cols-2 xl:grid-cols-3">{modules.map(([title, text, href, Icon]) => <Link key={href} href={href} className="rounded-lg border bg-white p-6 transition hover:border-leaf hover:shadow-soft"><Icon className="h-8 text-emerald-700" /><h2 className="mt-5 text-xl font-black">{title}</h2><p className="mt-2 leading-7 text-slate-500">{text}</p></Link>)}</section>
    </main>
  );
}
