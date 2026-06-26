import { requireMaximusAccess } from '@/lib/maximus-auth';
import MaximusWorkspace from '../MaximusWorkspace';

export const metadata = { title: 'Flux centralisés | Maximus' };

export default async function MaximusWorkflowsPage() {
  const { admin } = await requireMaximusAccess();
  return <MaximusWorkspace adminName={admin.full_name || admin.email} workflowView />;
}
