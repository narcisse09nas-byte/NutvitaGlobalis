'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Eye, Plus, Send, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type ChecklistItem = { label: string; completed: boolean };

const text = (input: unknown) => typeof input === 'string' ? input : '';
const staffName = (row?: Row) => row
  ? [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title
  : '';
const listFromText = (input: unknown) => text(input).split(/\r?\n/).map(label => label.trim()).filter(Boolean).map(label => ({ label, completed: false }));

function checklist(input: unknown): ChecklistItem[] {
  if (!Array.isArray(input)) return [];
  return input.map(raw => {
    if (typeof raw === 'string') return { label: raw, completed: false };
    const row = raw as Record<string, unknown>;
    return { label: text(row.label) || text(row.name), completed: Boolean(row.completed) };
  }).filter(row => row.label);
}

export default function OnboardingManagement() {
  const [records, setRecords] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [documents, setDocuments] = useState<ChecklistItem[]>([]);
  const [equipment, setEquipment] = useState<ChecklistItem[]>([]);
  const [orientation, setOrientation] = useState<ChecklistItem[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [onboardingRows, staffRows, trainingRows] = await Promise.all([
      fetchModule('hr/onboarding'),
      fetchModule('hr/staff'),
      fetchModule('hr/my-training'),
    ]);
    setRecords(onboardingRows);
    setStaff(staffRows);
    setTrainingRecords(trainingRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load onboarding.'));
  }, []);

  const eligibleStaff = staff.filter(row => row.status === 'validated' && !records.some(record =>
    text(record.data.employee_id) === row.id && record.status !== 'archived'
  ));
  const selectedEmployee = staff.find(row => row.id === employeeId);
  const trainings = trainingRecords.filter(row => row.data.record_type === 'training');
  const assignments = trainingRecords.filter(row => row.data.record_type === 'assignment');

  function mandatoryFor(employee?: Row) {
    const position = text(employee?.data.position);
    return trainings.filter(row => Boolean(row.data.is_mandatory) && (!text(row.data.position) || text(row.data.position) === position));
  }

  function trainingCompleted(record: Row, trainingId: string) {
    return assignments.some(row =>
      text(row.data.employee_id) === text(record.data.employee_id) &&
      text(row.data.training_id) === trainingId &&
      row.status === 'validated'
    );
  }

  function progress(record: Row, overrides?: { documents: ChecklistItem[]; equipment: ChecklistItem[]; orientation: ChecklistItem[] }) {
    const documentRows = overrides?.documents || checklist(record.data.documents);
    const equipmentRows = overrides?.equipment || checklist(record.data.equipment);
    const orientationRows = overrides?.orientation || checklist(record.data.orientation_tasks);
    const trainingIds = Array.isArray(record.data.mandatory_training_ids) ? record.data.mandatory_training_ids.map(String) : [];
    const tasks = [
      ...documentRows.map(item => item.completed),
      ...equipmentRows.map(item => item.completed),
      ...orientationRows.map(item => item.completed),
      ...trainingIds.map(id => trainingCompleted(record, id)),
    ];
    return tasks.length ? Math.round(tasks.filter(Boolean).length / tasks.length * 100) : 100;
  }

  function openDetails(row: Row) {
    setSelected(row);
    setDocuments(checklist(row.data.documents));
    setEquipment(checklist(row.data.equipment));
    setOrientation(checklist(row.data.orientation_tasks));
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const mandatory = mandatoryFor(selectedEmployee);
    const data = {
      employee_id: selectedEmployee.id,
      employee: staffName(selectedEmployee),
      position: selectedEmployee.data.position,
      unit: selectedEmployee.data.unit,
      start_date: values.start_date,
      supervisor_id: values.supervisor_id,
      supervisor: staffName(staff.find(row => row.id === values.supervisor_id)),
      documents: listFromText(values.documents),
      equipment: listFromText(values.equipment),
      orientation_tasks: listFromText(values.orientation_tasks),
      mandatory_training_ids: mandatory.map(row => row.id),
      mandatory_trainings: mandatory.map(row => row.title),
      notes: values.notes,
      completion_percentage: 0,
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'hr/onboarding', title: `Onboarding - ${staffName(selectedEmployee)}`, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to create the onboarding plan.');
    setFormOpen(false);
    setEmployeeId('');
    setMessage('Onboarding plan created.');
    await load();
  }

  async function saveChecklist() {
    if (!selected) return;
    const completion = progress(selected, { documents, equipment, orientation });
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        data: { ...selected.data, documents, equipment, orientation_tasks: orientation, completion_percentage: completion },
      }),
    });
    if (!response.ok) return setMessage('Unable to update the onboarding checklist.');
    setMessage('Onboarding progress updated.');
    await load();
    setSelected(current => current ? { ...current, data: { ...current.data, documents, equipment, orientation_tasks: orientation, completion_percentage: completion } } : null);
  }

  async function changeStatus(row: Row, status: 'submitted' | 'validated') {
    const completion = progress(row);
    if (status === 'submitted' && completion < 100) return setMessage('All onboarding tasks and mandatory trainings must be completed before submission.');
    if (status === 'validated') {
      const employee = staff.find(item => item.id === text(row.data.employee_id));
      if (employee) {
        await fetch('/api/maximus/records', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: employee.id,
            data: { ...employee.data, onboarding_completed: true, onboarding_completed_at: new Date().toISOString() },
          }),
        });
      }
    }
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status, data: { ...row.data, completion_percentage: completion } }),
    });
    if (!response.ok) return setMessage('Unable to update the onboarding status.');
    setSelected(null);
    setMessage(status === 'validated' ? 'Employee onboarding validated.' : 'Onboarding submitted for validation.');
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete onboarding plan for "${text(row.data.employee)}"?`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete the onboarding plan.');
    setMessage('Onboarding plan deleted.');
    await load();
  }

  function Checklist({ title, rows, setRows }: { title: string; rows: ChecklistItem[]; setRows: (rows: ChecklistItem[]) => void }) {
    return <section><h4 className="font-black">{title}</h4><div className="mt-3 grid gap-2">
      {rows.length ? rows.map((item, index) => <label key={`${item.label}-${index}`} className="flex items-center gap-3 rounded-md border p-3 text-sm">
        <input type="checkbox" checked={item.completed} onChange={event => setRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, completed: event.target.checked } : row))} />
        <span className={item.completed ? 'text-slate-400 line-through' : 'font-semibold'}>{item.label}</span>
      </label>) : <p className="text-sm text-slate-500">No tasks configured.</p>}
    </div></section>;
  }

  return <div className="grid gap-6 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-3xl font-black">Onboarding &amp; Training</h2>
      <p className="mt-1 text-sm text-slate-500">Manage employee induction, documents, equipment and mandatory training.</p></div>
      <button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />New Onboarding Plan</button>
    </div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.startsWith('All onboarding') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Employee Onboarding Register</h3>
      <p className="mt-1 text-sm text-slate-500">Track every active induction plan and its completion status.</p>
      {records.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Plan ID</th><th className="p-3">Employee</th><th className="p-3">Position</th>
          <th className="p-3">Start Date</th><th className="p-3">Supervisor</th><th className="p-3">Progress</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{records.map(row => {
          const completion = progress(row);
          return <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td>
            <td className="p-3 font-semibold">{text(row.data.employee)}</td><td className="p-3">{text(row.data.position)}</td><td className="p-3">{text(row.data.start_date)}</td>
            <td className="p-3">{text(row.data.supervisor) || 'N/A'}</td><td className="p-3"><div className="flex min-w-32 items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#24945f]" style={{ width: `${completion}%` }} /></div><span className="text-xs font-bold">{completion}%</span></div></td>
            <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{row.status}</span></td>
            <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openDetails(row)} title="Open Checklist" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
              {row.status === 'draft' && completion === 100 && <button onClick={() => changeStatus(row, 'submitted')} title="Submit" className="rounded-md border p-2 text-emerald-700"><Send className="h-4 w-4" /></button>}
              {row.status === 'submitted' && <button onClick={() => changeStatus(row, 'validated')} title="Validate Onboarding" className="rounded-md bg-[#24945f] p-2 text-white"><CheckCircle2 className="h-4 w-4" /></button>}
              {row.status === 'draft' && <button onClick={() => remove(row)} title="Delete" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button>}</div></td>
          </tr>;
        })}</tbody>
      </table></div> : <div className="grid min-h-56 place-items-center text-center text-sm text-slate-500"><div><ClipboardCheck className="mx-auto h-12 w-12" /><p className="mt-4">No onboarding plans found.</p></div></div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}>
      <section className="my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">New Onboarding Plan</h3><p className="mt-1 text-sm text-slate-500">Prepare the induction package for a validated staff member.</p></div>
          <button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header>
        <form onSubmit={create} className="grid gap-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Employee<select className="admin-input" required value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
            <option value="">Select an employee</option>{eligibleStaff.map(row => <option key={row.id} value={row.id}>{staffName(row)} - {text(row.data.position)}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Start Date<input className="admin-input" name="start_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Supervisor<select className="admin-input" name="supervisor_id"><option value="">Select a supervisor</option>{staff.filter(row => row.status === 'validated' && row.id !== employeeId).map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label></div>
          <div className="rounded-md bg-emerald-50 p-4 text-sm"><strong>{mandatoryFor(selectedEmployee).length}</strong> mandatory training(s) will be attached automatically for the selected position.</div>
          <label className="grid gap-2 text-sm font-semibold">Documents to Submit<textarea className="admin-input min-h-24" name="documents" placeholder={'One item per line\nSigned contract\nIdentity document\nTax information'} /></label>
          <label className="grid gap-2 text-sm font-semibold">Equipment to Assign<textarea className="admin-input min-h-24" name="equipment" placeholder={'One item per line\nLaptop\nBadge\nProtective equipment'} /></label>
          <label className="grid gap-2 text-sm font-semibold">Orientation Tasks<textarea className="admin-input min-h-24" name="orientation_tasks" placeholder={'One item per line\nOffice tour\nSecurity briefing\nMeet the team'} /></label>
          <label className="grid gap-2 text-sm font-semibold">Notes<textarea className="admin-input min-h-20" name="notes" /></label>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Create Plan'}</button></div>
        </form>
      </section>
    </div>}

    {selected && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}>
      <section className="mx-auto my-6 w-full max-w-4xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{text(selected.data.employee)}</h3>
          <p className="mt-1 text-sm text-slate-500">{text(selected.data.position)} | {progress(selected, { documents, equipment, orientation })}% completed</p></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header>
        <div className="grid gap-7 p-6 md:grid-cols-2"><Checklist title="Documents" rows={documents} setRows={setDocuments} /><Checklist title="Equipment" rows={equipment} setRows={setEquipment} />
          <Checklist title="Orientation" rows={orientation} setRows={setOrientation} />
          <section><h4 className="font-black">Mandatory Trainings</h4><div className="mt-3 grid gap-2">
            {(Array.isArray(selected.data.mandatory_training_ids) ? selected.data.mandatory_training_ids.map(String) : []).map(id => {
              const training = trainings.find(row => row.id === id); const completed = trainingCompleted(selected, id);
              return <div key={id} className="flex items-center gap-3 rounded-md border p-3 text-sm">{completed ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <span className="h-5 w-5 rounded-full border" />}
                <span className={completed ? 'text-slate-400 line-through' : 'font-semibold'}>{training?.title || id}</span></div>;
            })}
            {!Array.isArray(selected.data.mandatory_training_ids) || selected.data.mandatory_training_ids.length === 0 ? <p className="text-sm text-slate-500">No mandatory trainings configured.</p> : null}
          </div></section>
        </div>
        <div className="flex justify-end gap-3 border-t p-6"><button onClick={() => setSelected(null)} className="btn-secondary">Close</button>
          {selected.status === 'draft' && <button onClick={saveChecklist} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">Save Progress</button>}</div>
      </section>
    </div>}
  </div>;
}
