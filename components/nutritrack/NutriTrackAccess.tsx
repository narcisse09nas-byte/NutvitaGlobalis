'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Country } from 'country-state-city';
import { createClient } from '@/lib/supabase/client';

type Props = {
  user: { email?: string | null; user_metadata?: Record<string, any> } | null;
  organization: Record<string, any> | null;
};

export default function NutriTrackAccess({ user, organization }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const countries = useMemo(
    () => Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const supabase = createClient();
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.refresh();
        router.push('/acces-nutritrack');
      }
      setLoading(false);
      return;
    }
    if (password !== String(form.get('password_confirmation') || '')) {
      setMessage('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }
    const metadata = {
      account_type: 'nutritrack_request',
      full_name: String(form.get('full_name') || ''),
      organization_name: String(form.get('organization_name') || ''),
      phone: String(form.get('phone') || ''),
      country: String(form.get('country') || ''),
      requested_facility_count: Number(form.get('requested_facility_count') || 1),
      requested_staff_count: Number(form.get('requested_staff_count') || 1),
    };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${location.origin}/acces-nutritrack`,
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      data.session
        ? 'Compte cree. Votre demande NutriTrack est en cours d examen.'
        : 'Compte cree. Confirmez votre adresse email. Votre demande sera ensuite examinee.',
    );
  }

  async function submitExistingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().rpc('submit_nutritrack_request', {
      p_name: String(form.get('organization_name') || ''),
      p_contact_name: String(form.get('full_name') || ''),
      p_contact_phone: String(form.get('phone') || ''),
      p_country: String(form.get('country') || ''),
      p_facility_count: Number(form.get('requested_facility_count') || 1),
      p_staff_count: Number(form.get('requested_staff_count') || 1),
    });
    setLoading(false);
    setMessage(error ? error.message : 'Demande envoyee a NutVitaGlobalis.');
    if (!error) router.refresh();
  }

  async function logout() {
    await createClient().auth.signOut();
    router.refresh();
  }

  if (user && organization?.status === 'approved') {
    return (
      <StatusCard title="Acces approuve" text="Votre espace NutriTrack est actif.">
        <Link href="/nutritrack" className="btn-primary">Ouvrir NutriTrack</Link>
      </StatusCard>
    );
  }

  if (user && organization) {
    const labels: Record<string, string> = {
      pending: 'Votre demande est en cours d examen par NutVitaGlobalis.',
      rejected: `Votre demande n a pas ete approuvee. ${organization.admin_notes || ''}`,
      suspended: 'Votre acces NutriTrack est temporairement suspendu.',
    };
    return (
      <StatusCard title="Demande NutriTrack" text={labels[organization.status] || 'Demande enregistree.'}>
        <button onClick={logout} className="btn-secondary">Se deconnecter</button>
      </StatusCard>
    );
  }

  if (user) {
    return (
      <RequestForm
        onSubmit={submitExistingRequest}
        countries={countries}
        loading={loading}
        message={message}
        defaultName={user.user_metadata?.full_name || ''}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl rounded-lg border bg-white p-6 shadow-soft md:p-8">
      <div className="mb-6 flex gap-2">
        <button onClick={() => setMode('login')} className={mode === 'login' ? 'btn-primary' : 'btn-secondary'}>
          J ai deja un compte
        </button>
        <button onClick={() => setMode('signup')} className={mode === 'signup' ? 'btn-primary' : 'btn-secondary'}>
          Creer un compte
        </button>
      </div>
      <form onSubmit={authenticate} className="grid gap-4 md:grid-cols-2">
        {mode === 'signup' && (
          <>
            <Field name="full_name" label="Nom du responsable" required />
            <Field name="organization_name" label="Organisation" required />
            <Field name="phone" label="Telephone" required />
            <CountryField countries={countries} />
            <Field name="requested_facility_count" label="Nombre de formations sanitaires" type="number" min="1" defaultValue="1" required />
            <Field name="requested_staff_count" label="Nombre de personnes/staff" type="number" min="1" defaultValue="1" required />
          </>
        )}
        <Field name="email" label="Email" type="email" required />
        <Field name="password" label="Mot de passe" type="password" minLength={8} required />
        {mode === 'signup' && <Field name="password_confirmation" label="Confirmation" type="password" minLength={8} required />}
        <button disabled={loading} className="btn-primary md:col-span-2">
          {loading ? 'Traitement...' : mode === 'login' ? 'Se connecter' : 'Creer le compte et envoyer la demande'}
        </button>
        {message && <p className="rounded-lg bg-mint p-4 text-sm font-bold text-forest md:col-span-2">{message}</p>}
      </form>
    </div>
  );
}

function RequestForm({ onSubmit, countries, loading, message, defaultName, onLogout }: any) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border bg-white p-6 shadow-soft md:p-8">
      <h2 className="text-2xl font-black">Demander un espace NutriTrack</h2>
      <p className="mt-2 text-slate-500">Votre compte actuel sera utilise. Aucun second compte n est necessaire.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <Field name="full_name" label="Nom du responsable" defaultValue={defaultName} required />
        <Field name="organization_name" label="Organisation" required />
        <Field name="phone" label="Telephone" required />
        <CountryField countries={countries} />
        <Field name="requested_facility_count" label="Nombre de formations sanitaires" type="number" min="1" defaultValue="1" required />
        <Field name="requested_staff_count" label="Nombre de personnes/staff" type="number" min="1" defaultValue="1" required />
        <button disabled={loading} className="btn-primary md:col-span-2">{loading ? 'Envoi...' : 'Envoyer la demande'}</button>
        {message && <p className="rounded-lg bg-mint p-4 text-sm font-bold text-forest md:col-span-2">{message}</p>}
      </form>
      <button onClick={onLogout} className="mt-5 text-sm font-bold text-leaf">Changer de compte</button>
    </div>
  );
}

function StatusCard({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border bg-white p-8 text-center shadow-soft">
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-500">{text}</p>
      <div className="mt-7 flex justify-center gap-3">{children}</div>
    </div>
  );
}

function CountryField({ countries }: { countries: Array<{ isoCode: string; name: string }> }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      Pays
      <select name="country" required className="admin-input">
        <option value="">Selectionner</option>
        {countries.map(country => <option key={country.isoCode} value={country.name}>{country.name}</option>)}
      </select>
    </label>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input {...input} className="admin-input" />
    </label>
  );
}
