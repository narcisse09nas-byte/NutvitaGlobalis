'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignupFields from '@/components/accounts/SignupFields';
import { createClient } from '@/lib/supabase/client';

export default function StaffCandidateAuth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email') || '');
    const password = String(values.get('password') || '');
    const supabase = createClient();
    if (mode === 'login') {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setMessage(result.error.message);
        setLoading(false);
        return;
      }
      if (result.data.user.user_metadata?.account_type !== 'staff_candidate') {
        await supabase.auth.signOut();
        setMessage('Ce compte n est pas un compte candidat Staff.');
        setLoading(false);
        return;
      }
      router.refresh();
      return;
    }
    if (password !== String(values.get('password_confirmation') || '')) {
      setMessage('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }
    const profile = {
      full_name: String(values.get('full_name') || ''),
      whatsapp_phone: String(values.get('whatsapp_phone') || ''),
      country: String(values.get('country') || ''),
      state_region: String(values.get('state_region') || ''),
      city: String(values.get('city')) === '__other' ? String(values.get('other_city') || '') : String(values.get('city') || ''),
      account_type: 'staff_candidate',
      accepted_terms_at: new Date().toISOString(),
      accepted_privacy_at: new Date().toISOString(),
    };
    const redirect = `${location.origin}/staff-candidat${params.get('offer') ? `?offer=${encodeURIComponent(params.get('offer')!)}` : ''}`;
    const result = await supabase.auth.signUp({ email, password, options: { data: profile, emailRedirectTo: redirect } });
    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }
    if (result.data.user && result.data.session) {
      await supabase.from('maximus_candidate_profiles').upsert({
        id: result.data.user.id,
        email,
        full_name: profile.full_name,
        phone: profile.whatsapp_phone,
        country: profile.country,
        region: profile.state_region,
        city: profile.city,
      });
    }
    setMessage(result.data.session ? 'Compte Staff cree.' : 'Compte cree. Confirmez votre adresse email.');
    setLoading(false);
    if (result.data.session) router.refresh();
  }
  return <div className={`w-full ${mode === 'signup' ? 'max-w-2xl' : 'max-w-md'} rounded-lg bg-white p-8 shadow-2xl`}>
    <Link href="/carrieres" className="text-sm font-bold text-leaf">← Retour aux offres</Link>
    <p className="mt-6 text-xs font-black uppercase tracking-widest text-orange">Recrutement Staff</p>
    <h1 className="mt-2 text-3xl font-black text-forest">Espace candidat</h1>
    <p className="mt-2 text-slate-500">{mode === 'login' ? 'Accedez a vos candidatures Staff.' : 'Creez un compte reserve aux recrutements Staff.'}</p>
    <form onSubmit={submit} className="mt-7 grid gap-4">{mode === 'signup' ? <SignupFields /> : <><label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input" /></label><label className="grid gap-2 text-sm font-bold">Mot de passe<input name="password" type="password" minLength={8} required className="admin-input" /></label></>}
      {message && <p className="rounded-lg bg-mint p-3 text-sm text-forest">{message}</p>}
      <button disabled={loading} className="btn-primary justify-center">{loading ? 'Patientez...' : mode === 'login' ? 'Se connecter' : 'Creer mon compte Staff'}</button>
    </form>
    <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} className="mt-5 w-full text-sm font-bold text-leaf">{mode === 'login' ? 'Creer un compte candidat Staff' : 'J ai deja un compte Staff'}</button>
    <p className="mt-6 border-t pt-5 text-xs leading-5 text-slate-500">Le recrutement des nutritionnistes partenaires utilise un espace distinct.</p>
  </div>;
}
