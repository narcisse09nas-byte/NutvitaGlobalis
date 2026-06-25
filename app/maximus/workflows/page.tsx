import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import MaximusWorkspace from '../MaximusWorkspace';

export const metadata = { title: 'Flux centralisés | Maximus' };

export default async function MaximusWorkflowsPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');
  return <MaximusWorkspace adminName={admin.full_name || admin.email} workflowView />;
}
