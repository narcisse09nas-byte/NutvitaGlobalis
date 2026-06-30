'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, ExternalLink, Plus, Upload, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;
}

function isExpired(row?: Row) {
  const expiry = text(row?.data.validation_expires_at);
  return Boolean(expiry && new Date(`${expiry}T23:59:59`) < new Date());
}

export default function MyTrainingPlan() {
  const [records, setRecords] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [dialog, setDialog] = useState<'catalog' | 'assign' | 'certificate' | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [trainingResponse, staffResponse] = await Promise.all([
      fetch('/api/maximus/records?module=hr%2Fmy-training'),
      fetch('/api/maximus/records?module=hr%2Fstaff'),
    ]);
    const trainingPayload = await trainingResponse.json();
    const staffPayload = await staffResponse.json();
    if (!trainingResponse.ok) throw new Error(trainingPayload.message || 'Unable to load training plan.');
    setRecords(trainingPayload.items || []);
    const staffRows = staffResponse.ok ? staffPayload.items || [] : [];
    setStaff(staffRows);
    setEmployeeId(current => current || staffRows.find((row: Row) => row.status === 'validated')?.id || '');
  }

  useEffect(() => { load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load training plan.')); }, []);

  const trainings = records.filter(row => row.data.record_type === 'training');
  const assignments = records.filter(row => row.data.record_type === 'assignment' && text(row.data.employee_id) === employeeId);
  const selectedEmployee = staff.find(row => row.id === employeeId);
  const mandatoryTrainings = trainings.filter(row => Boolean(row.data.is_mandatory) && (!text(row.data.position) || text(row.data.position) === text(selectedEmployee?.data.position)));
  const developmentalAssignments = assignments.filter(row => !row.data.is_mandatory);
  const assignmentFor = (training: Row) => assignments.find(row => text(row.data.training_id) === training.id);
  const availableDevelopmental = trainings.filter(row => !row.data.is_mandatory && !assignmentFor(row));

  const completion = (rows: Row[], resolveAssignment: (row: Row) => Row | undefined) => {
    if (!rows.length) return 0;
    const completed = rows.filter(row => {
      const assignment = resolveAssignment(row);
      return assignment?.status === 'validated' && !isExpired(assignment);
    }).length;
    return Math.round((completed / rows.length) * 100);
  };
  const mandatoryCompletion = completion(mandatoryTrainings, assignmentFor);
  const developmentalCompletion = developmentalAssignments.length
    ? Math.round(developmentalAssignments.filter(row => row.status === 'validated' && !isExpired(row)).length / developmentalAssignments.length * 100)
    : 0;

  async function createRecord(title: string, data: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'hr/my-training', title, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.message || 'Unable to save training data.');
      return null;
    }
    await load();
    return payload.item as Row;
  }

  async function saveTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const created = await createRecord(text(values.name), {
      record_type: 'training',
      name: values.name,
      description: values.description,
      link: values.link,
      is_mandatory: values.is_mandatory === 'on',
      position: values.position,
      validity_months: Number(values.validity_months || 12),
    });
    if (created) {
      setDialog(null);
      setMessage('Training added to the catalog.');
    }
  }

  async function assignTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const training = trainings.find(row => row.id === values.training_id);
    if (!training || !selectedEmployee) return;
    const created = await createRecord(`${staffName(selectedEmployee)} - ${training.title}`, {
      record_type: 'assignment',
      training_id: training.id,
      training_name: training.title,
      employee_id: selectedEmployee.id,
      employee_name: staffName(selectedEmployee),
      is_mandatory: false,
      plan: values.plan || 'Added to personal development plan.',
    });
    if (created) {
      setDialog(null);
      setMessage('Training added to the development plan.');
    }
  }

  async function uploadCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTraining || !selectedEmployee) return;
    setBusy(true);
    const values = new FormData(event.currentTarget);
    const file = values.get('certificate');
    const assignment = assignmentFor(selectedTraining);
    let target: Row | null | undefined = assignment;
    if (!target) {
      target = await createRecord(`${staffName(selectedEmployee)} - ${selectedTraining.title}`, {
        record_type: 'assignment',
        training_id: selectedTraining.id,
        training_name: selectedTraining.title,
        employee_id: selectedEmployee.id,
        employee_name: staffName(selectedEmployee),
        is_mandatory: true,
      });
    }
    if (!target) {
      setBusy(false);
      return;
    }
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: target.id,
        status: 'submitted',
        data: {
          ...target.data,
          certificate_name: file instanceof File ? file.name : text(file),
          completed_at: new Date().toISOString(),
        },
      }),
    });
    setBusy(false);
    if (!response.ok) return setMessage('Unable to submit the certificate.');
    setDialog(null);
    setSelectedTraining(null);
    setMessage('Certificate submitted for acknowledgment.');
    await load();
  }

  async function changeStatus(row: Row, status: string) {
    const data = status === 'validated'
      ? { ...row.data, validation_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10) }
      : row.data;
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status, data }),
    });
    if (!response.ok) return setMessage('Unable to update training status.');
    await load();
  }

  function statusLabel(assignment?: Row) {
    if (!assignment) return 'Pending';
    if (isExpired(assignment)) return 'Expired';
    return ({ draft: 'Pending', submitted: 'Pending Acknowledgment', endorsed: 'Pending Validation', validated: 'Validated', rejected: 'Rejected' }[assignment.status] || assignment.status);
  }

  function TrainingCard({ training, assignment }: { training: Row; assignment?: Row }) {
    const expired = isExpired(assignment);
    return <article className="flex min-h-64 flex-col rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black">{training.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{text(training.data.description)}</p>
      <div className="mt-4"><p className="text-xs font-bold uppercase text-slate-400">Status</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${assignment?.status === 'validated' && !expired ? 'bg-emerald-100 text-emerald-800' : assignment?.status === 'rejected' || expired ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{assignment?.status === 'validated' && !expired ? <CheckCircle2 className="h-3 w-3" /> : expired || assignment?.status === 'rejected' ? <AlertCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}{statusLabel(assignment)}</span></div>
      {Boolean(assignment?.data.plan) && <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">{text(assignment?.data.plan)}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {text(training.data.link) && <a href={text(training.data.link)} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-bold"><ExternalLink className="h-4 w-4" />Go to Training</a>}
        {(!assignment || assignment.status === 'draft' || assignment.status === 'rejected' || expired) && <button onClick={() => { setSelectedTraining(training); setDialog('certificate'); }} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Upload className="h-4 w-4" />{expired ? 'Upload New Certificate' : 'Upload Certificate'}</button>}
        {assignment?.status === 'submitted' && <button onClick={() => changeStatus(assignment, 'endorsed')} className="rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white">Acknowledge</button>}
        {assignment?.status === 'endorsed' && <button onClick={() => changeStatus(assignment, 'validated')} className="rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white">Validate</button>}
      </div>
    </article>;
  }

  return <div className="grid gap-8 text-slate-950">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><h2 className="text-3xl font-black">My Training Plan</h2><div className="flex gap-2"><button onClick={() => setDialog('catalog')} className="rounded-md border bg-white px-4 py-3 text-sm font-semibold">Manage Catalog</button><select className="admin-input min-w-64" value={employeeId} onChange={event => setEmployeeId(event.target.value)}><option value="">Select staff member</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></div></div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Mandatory Training Progress</h3><p className="mt-1 text-sm text-slate-500">Overall progress for trainings required for the selected position: <strong className="text-emerald-800">{text(selectedEmployee?.data.position) || 'N/A'}</strong></p><div className="mt-6 flex items-center gap-4"><div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#24945f]" style={{ width: `${mandatoryCompletion}%` }} /></div><span className="text-lg font-black">{mandatoryCompletion}%</span></div></section>
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{mandatoryTrainings.map(training => <TrainingCard key={training.id} training={training} assignment={assignmentFor(training)} />)}</section>

    <section className="border-t pt-8"><div className="flex items-center justify-between gap-4"><div><h3 className="text-xl font-black">Personal Development Plan</h3><p className="mt-1 text-sm text-slate-500">Progress on optional trainings selected for this employee.</p></div><button onClick={() => setDialog('assign')} disabled={!employeeId} className="flex items-center gap-2 rounded-md border bg-white px-4 py-3 text-sm font-bold disabled:opacity-45"><Plus className="h-4 w-4" />Add Training</button></div><div className="mt-6 flex items-center gap-4"><div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[#24945f]" style={{ width: `${developmentalCompletion}%` }} /></div><span className="text-lg font-black">{developmentalCompletion}%</span></div><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{developmentalAssignments.length ? developmentalAssignments.map(assignment => { const training = trainings.find(row => row.id === assignment.data.training_id); return training ? <TrainingCard key={assignment.id} training={training} assignment={assignment} /> : null; }) : <div className="py-14 text-sm text-slate-500 md:col-span-2 xl:col-span-3">You have not added any developmental trainings to this plan yet.</div>}</div></section>

    {dialog && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setDialog(null)}><section className="w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">{dialog === 'catalog' ? 'Add Training to Catalog' : dialog === 'assign' ? 'Add to Development Plan' : 'Upload Certificate'}</h3><p className="mt-1 text-sm text-slate-500">{dialog === 'certificate' ? `Submit completion evidence for "${selectedTraining?.title}".` : 'Complete the training information below.'}</p></div><button onClick={() => setDialog(null)}><X className="h-5 w-5" /></button></header>
      {dialog === 'catalog' && <form onSubmit={saveTraining} className="grid gap-5 p-6"><label className="grid gap-2 text-sm font-semibold">Training Name<input className="admin-input" name="name" required /></label><label className="grid gap-2 text-sm font-semibold">Description<textarea className="admin-input min-h-24" name="description" required /></label><label className="grid gap-2 text-sm font-semibold">Training Link<input className="admin-input" name="link" type="url" /></label><label className="flex items-center gap-3 rounded-md border p-4 text-sm font-semibold"><input name="is_mandatory" type="checkbox" />Mandatory training</label><label className="grid gap-2 text-sm font-semibold">Mandatory for Position<input className="admin-input" name="position" /></label><label className="grid gap-2 text-sm font-semibold">Certificate Validity (months)<input className="admin-input" name="validity_months" type="number" min="1" defaultValue="12" /></label><button disabled={busy} className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">Save Training</button></form>}
      {dialog === 'assign' && <form onSubmit={assignTraining} className="grid gap-5 p-6"><label className="grid gap-2 text-sm font-semibold">Available Training<select className="admin-input" name="training_id" required><option value="">Select training</option>{availableDevelopmental.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Development Plan<textarea className="admin-input min-h-24" name="plan" placeholder="How this training supports the employee's development." /></label><button disabled={busy} className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">Add to Plan</button></form>}
      {dialog === 'certificate' && <form onSubmit={uploadCertificate} className="grid gap-5 p-6"><label className="grid gap-2 text-sm font-semibold">Certificate File<input className="admin-input" name="certificate" type="file" accept="application/pdf,image/*" required /></label><button disabled={busy} className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">Submit for Review</button></form>}
    </section></div>}
  </div>;
}
