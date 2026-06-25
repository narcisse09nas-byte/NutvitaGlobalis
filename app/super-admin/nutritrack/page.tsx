import AdminShell from '@/components/admin/AdminShell';
import NutriTrackRequestManager from '@/components/nutritrack/NutriTrackRequestManager';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export default async function NutriTrackAdminPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');
  const { data: organizations } = await supabase
    .from('nutritrack_organizations')
    .select('*')
    .order('created_at', { ascending: false });
  return (
    <AdminShell name={admin.full_name || admin.email}>
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-700">NutriTrack</p>
            <h1 className="mt-2 text-3xl font-black">Acces des organisations</h1>
            <p className="mt-2 text-slate-500">Approuvez, rejetez ou supprimez les espaces NutriTrack.</p>
          </div>
          <Link href="/super-admin/nutritrack/dashboard" className="btn-primary">
            <ChartBarIcon className="mr-2 h-5" />
            Voir l utilisation de NutriTrack
          </Link>
        </div>
      </div>
      <NutriTrackRequestManager initial={organizations || []} />
    </AdminShell>
  );
}
