import Link from 'next/link';
import MaximusLoginForm from './MaximusLoginForm';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';

export const metadata = { title: 'Connexion Maximus | NutVitaGlobalis' };

export default async function MaximusLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-[#123d32] p-5">
    <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
      <Link href="/" className="text-xl font-black text-[#123d32]">Maximus</Link>
      <p className="mt-1 text-sm font-semibold text-[#ef7f3b]">Gestion interne du cabinet et restauration NutVita</p>
      <h1 className="mt-8 text-3xl font-black">Connexion Maximus</h1>
      <p className="mt-2 text-slate-500">Espace autonome reserve aux comptes autorises.</p>
      {hasLocalAdminMode() && !hasSupabaseConfig() && <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm">
        <b>Mode local actif</b>
        <p className="mt-2">Utilisez les identifiants locaux definis pour l'administration.</p>
      </div>}
      {params.setup === '1' && <p className="mt-5 rounded-xl bg-orange-50 p-4 text-sm text-orange-700">Supabase n est pas configure.</p>}
      {params.unauthorized === '1' && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">Ce compte n est pas autorise pour Maximus.</p>}
      {params.acces === 'refuse' && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">Acces Maximus refuse.</p>}
      <MaximusLoginForm />
    </section>
  </main>;
}
