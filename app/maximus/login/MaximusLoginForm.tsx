'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { hasLocalAdminMode } from '@/lib/supabase/config';

export default function MaximusLoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') || '');
    const password = String(data.get('password') || '');
    try {
      if (hasLocalAdminMode()) {
        const response = await fetch('/api/admin/local-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Connexion impossible.');
        localStorage.setItem('nutvita-local-admin', '1');
        localStorage.setItem('nutvita-local-admin-email', result.email);
        router.push('/maximus');
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const logged = await fetch('/api/admin/login', { method: 'POST' });
      if (!logged.ok) {
        await supabase.auth.signOut();
        throw new Error('Ce compte ne dispose pas d un acces Maximus actif.');
      }
      router.push('/maximus');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Connexion impossible.');
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="mt-7 grid gap-4">
    <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input" /></label>
    <label className="grid gap-2 text-sm font-bold">Mot de passe<input name="password" type="password" minLength={8} required className="admin-input" /></label>
    {message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    <button disabled={loading} className="btn-primary">{loading ? 'Connexion...' : 'Se connecter a Maximus'}</button>
  </form>;
}
