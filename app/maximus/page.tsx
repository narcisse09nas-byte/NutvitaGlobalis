import { requireMaximusAccess } from '@/lib/maximus-auth';
import MaximusWorkspace from './MaximusWorkspace';

export const metadata = { title: 'Maximus | Gestion interne NutVitaGlobalis' };

export default async function MaximusPage() {
  const { admin } = await requireMaximusAccess();
  return <MaximusWorkspace adminName={admin.full_name || admin.email} />;
}
