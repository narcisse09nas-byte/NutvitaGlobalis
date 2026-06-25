'use client';

import { FormEvent, useState } from 'react';

type Row = Record<string, any>;
type Facility = { id: string; name: string };

const roles = [
  ['creator', 'Createur'],
  ['verifier', 'Verificateur'],
  ['validator', 'Validateur'],
  ['organization_admin', 'Administrateur organisation'],
] as const;

export default function NutriTrackMemberManager({
  initialMembers,
  assignments,
  facilities,
}: {
  initialMembers: Row[];
  assignments: Row[];
  facilities: Facility[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const result: Record<string, string[]> = {};
    assignments.forEach(item => {
      result[item.member_id] = [...(result[item.member_id] || []), item.facility_document_id];
    });
    return result;
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(memberId: string, facilityId: string) {
    setSelected(current => {
      const values = current[memberId] || [];
      return {
        ...current,
        [memberId]: values.includes(facilityId)
          ? values.filter(value => value !== facilityId)
          : [...values, facilityId],
      };
    });
  }

  async function call(payload: Record<string, any>) {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/nutritrack/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.message);
      return null;
    }
    setMessage('Acces NutriTrack mis a jour.');
    return result;
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const temporaryId = 'new';
    const result = await call({
      action: 'invite',
      full_name: values.get('full_name'),
      email: values.get('email'),
      role: values.get('role'),
      facilities: selected[temporaryId] || [],
    });
    if (result?.member) {
      setMembers(current => [...current, result.member]);
      setSelected(current => ({ ...current, [result.member.id]: current[temporaryId] || [], [temporaryId]: [] }));
      form.reset();
    }
  }

  async function update(row: Row, changes: Record<string, any>) {
    const next = { ...row, ...changes };
    if (await call({
      action: 'update',
      id: row.id,
      role: next.role,
      status: next.status,
      facilities: selected[row.id] || [],
    })) {
      setMembers(current => current.map(item => item.id === row.id ? next : item));
    }
  }

  async function remove(row: Row) {
    if (!confirm(`Retirer ${row.email} de NutriTrack ?`)) return;
    if (await call({ action: 'remove', id: row.id })) {
      setMembers(current => current.filter(item => item.id !== row.id));
    }
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={invite} className="grid gap-4 rounded-lg border bg-white p-6 md:grid-cols-2">
        <h2 className="text-xl font-black md:col-span-2">Inviter un membre</h2>
        <label className="grid gap-2 text-sm font-bold">Nom complet<input name="full_name" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Email<input name="email" type="email" required className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Role<select name="role" className="admin-input">{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <FacilityChoices facilities={facilities} values={selected.new || []} onToggle={id => toggle('new', id)} />
        <button disabled={busy} className="btn-primary md:col-span-2">Inviter et attribuer les acces</button>
      </form>
      {message && <p className="rounded-lg bg-mint p-4 font-bold text-forest">{message}</p>}
      <section className="grid gap-4">
        <h2 className="text-2xl font-black">Equipe NutriTrack</h2>
        {members.map(row => (
          <article key={row.id} className="rounded-lg border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><b>{row.full_name}</b><p className="text-sm text-slate-500">{row.email}</p></div>
              <div className="flex gap-2">
                <select value={row.role} onChange={event => update(row, { role: event.target.value })} className="admin-input py-2">
                  {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <button onClick={() => update(row, { status: row.status === 'active' ? 'suspended' : 'active' })} className="btn-secondary">
                  {row.status === 'active' ? 'Suspendre' : 'Activer'}
                </button>
                <button onClick={() => remove(row)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Retirer</button>
              </div>
            </div>
            <div className="mt-4">
              <FacilityChoices facilities={facilities} values={selected[row.id] || []} onToggle={id => toggle(row.id, id)} />
              <button onClick={() => update(row, {})} className="mt-3 text-sm font-bold text-cyan-700">Enregistrer les formations sanitaires</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function FacilityChoices({ facilities, values, onToggle }: { facilities: Facility[]; values: string[]; onToggle: (id: string) => void }) {
  return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-2 text-sm font-bold">Formations sanitaires accessibles</legend>
      <div className="flex flex-wrap gap-3">
        {facilities.map(facility => (
          <label key={facility.id} className="flex gap-2 text-sm">
            <input type="checkbox" checked={values.includes(facility.id)} onChange={() => onToggle(facility.id)} />
            {facility.name}
          </label>
        ))}
        {!facilities.length && <p className="text-sm text-slate-400">Creez d abord une formation sanitaire dans Health Areas.</p>}
      </div>
    </fieldset>
  );
}
