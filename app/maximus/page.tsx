import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import MaximusWorkspace from './MaximusWorkspace';

export const metadata = { title: 'Maximus | Gestion interne NutVitaGlobalis' };

export default async function MaximusPage() {
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');
  return <MaximusWorkspace adminName={admin.full_name || admin.email} />;
}
