import { redirect } from 'next/navigation';
import Link from 'next/link';
import NutriTrackMemberManager from '@/components/nutritrack/NutriTrackMemberManager';
import { requireNutriTrackAccess } from '@/lib/nutritrack-auth';

export default async function NutriTrackAdministrationPage() {
  const { supabase, member } = await requireNutriTrackAccess();
  if (member.role !== 'organization_admin' && !member.roles?.includes('organization_admin')) redirect('/nutritrack');
  const [{ data: members }, { data: assignments }, { data: facilityDocuments }] = await Promise.all([
    supabase.from('nutritrack_members').select('*').eq('organization_id', member.organization_id).order('created_at'),
    supabase.from('nutritrack_member_facilities').select('*'),
    supabase.from('nutritrack_documents').select('document_id,data').eq('collection_path', 'healthAreas'),
  ]);
  const facilities = (facilityDocuments || []).map(row => ({
    id: row.document_id,
    name: row.data?.healthFacilityName || row.data?.healthArea || row.document_id,
  }));
  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/nutritrack" className="text-sm font-bold text-cyan-700">Retour a NutriTrack</Link>
        <div className="mb-8 mt-5">
          <p className="text-xs font-black uppercase tracking-widest text-cyan-700">Administration organisation</p>
          <h1 className="mt-2 text-3xl font-black">Equipe et droits d acces</h1>
          <p className="mt-2 text-slate-500">Invitez les membres, attribuez les roles et limitez leurs formations sanitaires.</p>
        </div>
        <NutriTrackMemberManager initialMembers={members || []} assignments={assignments || []} facilities={facilities} />
      </div>
    </main>
  );
}
