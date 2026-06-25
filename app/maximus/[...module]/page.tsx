import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { maximusModuleMap } from '@/lib/maximus-modules';
import MaximusWorkspace from '../MaximusWorkspace';

export default async function MaximusModulePage({ params }: { params: Promise<{ module: string[] }> }) {
  const slug = (await params).module.join('/');
  const module = maximusModuleMap.get(slug);
  if (!module) notFound();
  const { supabase, admin } = await requireAdmin();
  const { data: current } = await supabase.from('admin_users').select('role').eq('id', admin.id).single();
  if (current?.role !== 'super_admin') redirect('/admin?acces=refuse');
  return <MaximusWorkspace adminName={admin.full_name || admin.email} module={module} />;
}
