import StaffCandidateAuth from '@/components/staff-candidate/StaffCandidateAuth';
import StaffCandidatePortal from '@/components/staff-candidate/StaffCandidatePortal';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Espace candidat Staff' };

export default async function StaffCandidatePage() {
  if (!hasSupabaseConfig()) return <main className="grid min-h-screen place-items-center bg-forest p-5"><div className="max-w-md rounded-lg bg-white p-8"><h1 className="text-2xl font-black">Configuration requise</h1><p className="mt-3">Connectez Supabase et executez maximus-recruitment.sql.</p></div></main>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.account_type !== 'staff_candidate') return <main className="grid min-h-screen place-items-center bg-forest p-5"><StaffCandidateAuth /></main>;
  return <StaffCandidatePortal email={user.email || ''} fullName={user.user_metadata?.full_name || 'Candidat'} />;
}
