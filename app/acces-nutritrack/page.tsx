import Link from 'next/link';
import NutriTrackAccess from '@/components/nutritrack/NutriTrackAccess';
import { getNutriTrackAccess } from '@/lib/nutritrack-auth';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Acces NutriTrack' };

export default async function NutriTrackAccessPage() {
  const { user, member, organization } = await getNutriTrackAccess();
  if (user && member?.status === 'active' && organization?.status === 'approved') redirect('/nutritrack');
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <div className="mx-auto mb-8 max-w-3xl">
        <Link href="/" className="text-sm font-bold text-leaf">Retour au site</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-widest text-cyan-600">NutriTrack</p>
        <h1 className="mt-2 text-4xl font-black text-forest">Application de support a la prise en charge integree de la malnutrition aigue</h1>
        <p className="mt-3 leading-7 text-slate-500">L acces est ouvert apres validation de l organisation par NutVitaGlobalis.</p>
      </div>
      <NutriTrackAccess
        user={user ? { email: user.email, user_metadata: user.user_metadata } : null}
        organization={organization}
      />
    </main>
  );
}
