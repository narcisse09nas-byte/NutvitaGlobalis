import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin';

type FeedbackRow = {
  id: string;
  organization_id: string;
  document_id: string;
  data: Record<string, any>;
  created_at: string;
};

function feedbackDate(row: FeedbackRow) {
  const value = row.data?.submittedAt;
  if (typeof value === 'string') return value;
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString();
  return row.created_at;
}

export default async function NutriTrackFeedbackPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');

  const [{ data: feedback }, { data: organizations }] = await Promise.all([
    supabase
      .from('nutritrack_documents')
      .select('id,organization_id,document_id,data,created_at')
      .eq('collection_path', 'feedback')
      .order('created_at', { ascending: false }),
    supabase.from('nutritrack_organizations').select('id,name'),
  ]);
  const organizationNames = new Map(
    ((organizations || []) as { id: string; name: string }[]).map(item => [item.id, item.name]),
  );
  const rows = (feedback || []) as FeedbackRow[];

  return (
    <AdminShell name={admin.full_name || admin.email}>
      <Link href="/super-admin/nutritrack" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800">
        <ArrowLeftIcon className="h-4" />
        Administration NutriTrack
      </Link>
      <div className="mt-6">
        <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Relation utilisateurs</p>
        <h1 className="mt-2 text-3xl font-black">Feedbacks NutriTrack</h1>
        <p className="mt-2 text-slate-500">Retours transmis par les organisations depuis leur espace NutriTrack.</p>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-4">Organisation</th>
              <th className="p-4">Satisfaction</th>
              <th className="p-4">Fonctionnalite</th>
              <th className="p-4">Message</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t align-top">
                <td className="p-4 font-bold">{organizationNames.get(row.organization_id) || 'Organisation inconnue'}</td>
                <td className="p-4 whitespace-nowrap">{row.data?.satisfaction || '-'} / 5</td>
                <td className="p-4">{row.data?.feature || '-'}</td>
                <td className="max-w-xl whitespace-pre-wrap p-4 leading-6">{row.data?.feedback || '-'}</td>
                <td className="p-4">{row.data?.contactEmail || '-'}</td>
                <td className="p-4 whitespace-nowrap">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(feedbackDate(row)))}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucun feedback NutriTrack pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
