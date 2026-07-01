import { notFound } from 'next/navigation';
import { requireMaximusAccess } from '@/lib/maximus-auth';
import { maximusModuleMap } from '@/lib/maximus-modules';
import MaximusWorkspace from '../MaximusWorkspace';

export default async function MaximusModulePage({ params }: { params: Promise<{ module: string[] }> }) {
  const slug = (await params).module.join('/');
  const module = maximusModuleMap.get(slug);
  if (!module) notFound();
  const { admin, allowedModules, isSuperAdmin } = await requireMaximusAccess(slug);
  return <MaximusWorkspace adminName={admin.full_name || admin.email} module={module} allowedModules={allowedModules} isSuperAdmin={isSuperAdmin} />;
}
