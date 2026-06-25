import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin';

type Organization = { id: string; name: string; status: string };
type Member = { organization_id: string; status: string; role: string };
type DocumentRow = { organization_id: string; collection_path: string; updated_at: string };

export default async function NutriTrackUsageDashboard() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');

  const [{ data: organizations }, { data: members }, { data: documents }, { data: reports }] = await Promise.all([
    supabase.from('nutritrack_organizations').select('id,name,status').order('name'),
    supabase.from('nutritrack_members').select('organization_id,status,role'),
    supabase.from('nutritrack_documents').select('organization_id,collection_path,updated_at'),
    supabase.from('nutritrack_ai_reports').select('organization_id,provider,status,created_at').order('created_at', { ascending: false }).limit(500),
  ]);

  const orgRows = (organizations || []) as Organization[];
  const memberRows = (members || []) as Member[];
  const documentRows = (documents || []) as DocumentRow[];
  const activeSince = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const modules = new Map<string, number>();
  documentRows.forEach(item => {
    const root = item.collection_path.split('/')[0] || 'autres';
    modules.set(root, (modules.get(root) || 0) + 1);
  });
  const organizationUsage = orgRows.map(organization => ({
    ...organization,
    members: memberRows.filter(item => item.organization_id === organization.id && item.status === 'active').length,
    documents: documentRows.filter(item => item.organization_id === organization.id).length,
    recent: documentRows.filter(item => item.organization_id === organization.id && new Date(item.updated_at).getTime() >= activeSince).length,
  }));
  const stats = [
    ['Organisations approuvees', orgRows.filter(item => item.status === 'approved').length],
    ['Utilisateurs actifs', memberRows.filter(item => item.status === 'active').length],
    ['Formations sanitaires', documentRows.filter(item => item.collection_path === 'healthAreas').length],
    ['Enfants enregistres', documentRows.filter(item => item.collection_path === 'children').length],
    ['Documents actifs sur 30 jours', documentRows.filter(item => new Date(item.updated_at).getTime() >= activeSince).length],
    ['Rapports IA generes', reports?.length || 0],
  ] as const;

  return (
    <AdminShell name={admin.full_name || admin.email}>
      <Link href="/super-admin/nutritrack" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800">
        <ArrowLeftIcon className="h-4" />
        Administration NutriTrack
      </Link>
      <div className="mt-6">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Pilotage centralise</p>
        <h1 className="mt-2 text-3xl font-black">Utilisation de NutriTrack</h1>
        <p className="mt-2 text-slate-500">Activite des organisations, des utilisateurs et des principaux modules.</p>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(([label, value]) => (
          <article key={label} className="rounded-lg border bg-white p-5">
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-black text-forest">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Activite par organisation</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr><th className="p-4">Organisation</th><th className="p-4">Statut</th><th className="p-4">Membres actifs</th><th className="p-4">Documents</th><th className="p-4">Activite 30 jours</th></tr>
            </thead>
            <tbody>
              {organizationUsage.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="p-4 font-bold">{row.name}</td><td className="p-4">{row.status}</td><td className="p-4">{row.members}</td><td className="p-4">{row.documents}</td><td className="p-4">{row.recent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-black">Modules les plus utilises</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...modules.entries()].sort((a, b) => b[1] - a[1]).map(([module, count]) => (
            <article key={module} className="flex items-center justify-between rounded-lg border bg-white p-4">
              <span className="font-bold">{module}</span><span className="rounded-full bg-cyan-50 px-3 py-1 font-black text-cyan-800">{count}</span>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
