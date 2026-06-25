'use client';

import { useState } from 'react';

type Row = Record<string, any>;

export default function NutriTrackRequestManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  async function action(row: Row, type: 'approve' | 'reject' | 'delete') {
    let reason = '';
    if (type !== 'approve') {
      reason = prompt(type === 'delete' ? 'Raison de la suppression :' : 'Raison du rejet :')?.trim() || '';
      if (!reason) return;
    } else {
      reason = prompt('Note interne facultative :')?.trim() || '';
    }
    setBusy(row.id);
    setMessage('');
    const response = await fetch('/api/admin/nutritrack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: type, id: row.id, reason }),
    });
    const result = await response.json();
    setBusy('');
    if (!response.ok) {
      setMessage(result.message);
      return;
    }
    if (type === 'delete') setRows(current => current.filter(item => item.id !== row.id));
    else setRows(current => current.map(item => item.id === row.id ? { ...item, status: type === 'approve' ? 'approved' : 'rejected', admin_notes: reason } : item));
    setMessage('Action NutriTrack enregistree.');
  }

  return (
    <div className="grid gap-5">
      {message && <p className="rounded-lg bg-mint p-4 font-bold text-forest">{message}</p>}
      {rows.map(row => (
        <article key={row.id} className="rounded-lg border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-cyan-700">{row.status}</p>
              <h2 className="mt-2 text-2xl font-black">{row.name}</h2>
              <p className="mt-1 text-slate-500">{row.contact_name} - {row.contact_email} - {row.contact_phone || 'Sans telephone'}</p>
              <p className="mt-4">{row.requested_facility_count} formation(s) sanitaire(s) et {row.requested_staff_count} compte(s) staff demandes.</p>
              {row.admin_notes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{row.admin_notes}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={busy === row.id} onClick={() => action(row, 'approve')} className="btn-primary">Approuver</button>
              <button disabled={busy === row.id} onClick={() => action(row, 'reject')} className="btn-secondary">Rejeter</button>
              <button disabled={busy === row.id} onClick={() => action(row, 'delete')} className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700">Supprimer</button>
            </div>
          </div>
        </article>
      ))}
      {!rows.length && <p className="rounded-lg border bg-white p-8 text-center text-slate-400">Aucune demande NutriTrack.</p>}
    </div>
  );
}
