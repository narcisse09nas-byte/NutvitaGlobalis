import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChartBarIcon, ClipboardDocumentCheckIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { requireAdmin } from '@/lib/admin';

export const metadata = { title: 'Manager | NutVitaGlobalis' };

export default async function ManagerPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');
  const items = [
    ['Tableaux de bord', 'Suivre les indicateurs essentiels et les performances.', '/admin/dashboard-business', ChartBarIcon],
    ['Equipes et recrutements', 'Organiser les ressources et les processus de recrutement.', '/admin/recrutement', UserGroupIcon],
    ['Operations', 'Superviser les projets, activites, jalons et livrables.', '/op-management', ClipboardDocumentCheckIcon],
    ['Finance et controles', 'Consulter les flux, justificatifs et etats financiers.', '/admin/paiements', CurrencyDollarIcon],
  ] as const;
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/services" className="text-sm font-bold text-forest">Retour aux services</Link>
        <div className="mt-5 border-b pb-7"><p className="text-xs font-black uppercase tracking-widest text-orange">Manager</p><h1 className="mt-2 text-4xl font-black">Console de direction</h1><p className="mt-3 text-slate-500">Un point d acces concentre pour superviser les equipes, operations et ressources.</p></div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">{items.map(([title, text, href, Icon]) => <Link href={href} key={title} className="rounded-lg border bg-white p-6 hover:border-leaf"><Icon className="h-8 text-emerald-700" /><h2 className="mt-4 text-xl font-black">{title}</h2><p className="mt-2 text-slate-500">{text}</p></Link>)}</div>
      </div>
    </main>
  );
}
