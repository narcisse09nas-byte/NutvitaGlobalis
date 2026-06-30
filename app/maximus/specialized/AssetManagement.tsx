'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, ClipboardCheck, Edit, History, MinusCircle, Plus, Search, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type View = 'assets' | 'assignments' | 'writeoffs';
type Dialog = 'asset' | 'assign' | 'writeoff' | 'inventory' | 'history' | null;

const text = (input: unknown) => typeof input === 'string' ? input : '';
const numeric = (input: unknown) => Number(input || 0);
const staffName = (row: Row) => [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;

export default function AssetManagement() {
  const [records, setRecords] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [kitchens, setKitchens] = useState<Row[]>([]);
  const [salePoints, setSalePoints] = useState<Row[]>([]);
  const [view, setView] = useState<View>('assets');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [activeAsset, setActiveAsset] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentStatus, setAssignmentStatus] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [disposalFilter, setDisposalFilter] = useState('all');
  const [assetType, setAssetType] = useState('General');
  const [locationType, setLocationType] = useState('Head Office');
  const [writeOffReason, setWriteOffReason] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [assetRows, staffRows, kitchenRows, pointRows] = await Promise.all([
      fetchModule('assets/inventory'), fetchModule('hr/staff'),
      fetchModule('production/central-kitchens'), fetchModule('sales/sale-points'),
    ]);
    setRecords(assetRows);
    setStaff(staffRows);
    setKitchens(kitchenRows);
    setSalePoints(pointRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load assets.'));
  }, []);

  const assets = records.filter(row => !row.data.record_type || row.data.record_type === 'asset');
  const assignments = records.filter(row => row.data.record_type === 'assignment');
  const writeoffs = records.filter(row => row.data.record_type === 'writeoff');
  const inventories = records.filter(row => row.data.record_type === 'inventory');

  const filteredAssets = assets.filter(row => {
    const haystack = [row.reference, row.title, row.data.unique_identifier, row.data.registration_number].map(value => String(value || '').toLowerCase()).join(' ');
    return (typeFilter === 'all' || text(row.data.asset_type) === typeFilter) &&
      (statusFilter === 'all' || text(row.data.asset_status) === statusFilter) &&
      (!search || haystack.includes(search.toLowerCase()));
  });
  const filteredAssignments = assignments.filter(row =>
    (assignmentStatus === 'all' || row.status === assignmentStatus) &&
    (staffFilter === 'all' || text(row.data.staff_id) === staffFilter)
  );
  const filteredWriteoffs = writeoffs.filter(row =>
    (reasonFilter === 'all' || text(row.data.reason) === reasonFilter) &&
    (disposalFilter === 'all' || text(row.data.disposal_method) === disposalFilter)
  );

  function openDialog(next: Dialog, asset: Row) {
    setActiveAsset(asset);
    setDialog(next);
    setAssetType(text(asset.data.asset_type) || 'General');
    setLocationType(text(asset.data.location_type) || 'Head Office');
    setWriteOffReason(asset.data.asset_status === 'Assigned' ? 'Lost' : '');
    setDisposalMethod('');
    setMessage('');
  }

  async function createRecord(title: string, data: Record<string, unknown>, status = 'acknowledged') {
    const response = await fetch('/api/maximus/records', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'assets/inventory', title, data }),
    });
    const payload = await response.json();
    if (response.ok && status !== 'draft') {
      await fetch('/api/maximus/records', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status }),
      });
    }
    if (!response.ok) throw new Error(payload.message || 'Unable to save asset data.');
    return payload.item as Row;
  }

  async function updateAsset(asset: Row, data: Record<string, unknown>) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: asset.id, title: data.name || asset.title, data }),
    });
    if (!response.ok) throw new Error('Unable to update the asset.');
  }

  async function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const years = numeric(values.amortization_duration);
    const acquisitionDate = String(values.acquisition_date);
    const amortizationEnd = new Date(`${acquisitionDate}T00:00:00`);
    amortizationEnd.setFullYear(amortizationEnd.getFullYear() + years);
    const locationId = String(values.location_id || '');
    const locations = locationType === 'Central Kitchen' ? kitchens : salePoints;
    const locationName = locationType === 'Head Office' ? 'Head Office' : text(locations.find(row => row.id === locationId)?.data.name) || locations.find(row => row.id === locationId)?.title || '';
    const data = {
      ...(activeAsset?.data || {}),
      record_type: 'asset',
      name: values.name,
      unique_identifier: values.unique_identifier,
      asset_type: assetType,
      registration_number: assetType === 'Vehicle' ? values.registration_number : '',
      fuel_type: ['Vehicle', 'Generator'].includes(assetType) ? values.fuel_type : '',
      last_mileage: ['Vehicle', 'Generator'].includes(assetType) ? numeric(values.last_mileage) : 0,
      initial_fuel_quantity: activeAsset ? activeAsset.data.initial_fuel_quantity : numeric(values.initial_fuel_quantity),
      description: values.description,
      acquisition_date: acquisitionDate,
      acquisition_value: numeric(values.acquisition_value),
      condition: values.condition,
      amortization_duration: years,
      amortization_end_date: amortizationEnd.toISOString().slice(0, 10),
      asset_status: activeAsset ? values.asset_status : 'In Stock',
      location_type: locationType,
      location_id: locationId,
      location: locationName,
      assigned_to: activeAsset?.data.assigned_to || '',
      assigned_to_id: activeAsset?.data.assigned_to_id || '',
    };
    setBusy(true);
    try {
      if (activeAsset) await updateAsset(activeAsset, data);
      else await createRecord(String(values.name), data);
      setDialog(null);
      setActiveAsset(null);
      setMessage(activeAsset ? 'Asset updated.' : 'Asset created.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the asset.');
    } finally {
      setBusy(false);
    }
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAsset) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const employee = staff.find(row => row.id === values.staff_id);
    if (!employee) return;
    setBusy(true);
    try {
      await createRecord(`Assignment - ${activeAsset.title}`, {
        record_type: 'assignment', asset_id: activeAsset.id, asset_reference: activeAsset.reference,
        asset_name: activeAsset.title, staff_id: employee.id, staff_name: staffName(employee),
        assignment_date: values.assignment_date, condition_at_assignment: values.condition, observation: values.observation,
      }, 'submitted');
      await updateAsset(activeAsset, { ...activeAsset.data, asset_status: 'Pending Assignment', assigned_to_id: employee.id, assigned_to: staffName(employee) });
      setDialog(null); setMessage('Asset assigned and awaiting staff acknowledgment.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to assign the asset.'); }
    finally { setBusy(false); }
  }

  async function acknowledgeAssignment(row: Row) {
    const asset = assets.find(item => item.id === text(row.data.asset_id));
    if (!asset) return;
    await fetch('/api/maximus/records', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status: 'validated', data: { ...row.data, acknowledged_at: new Date().toISOString() } }),
    });
    await updateAsset(asset, { ...asset.data, asset_status: 'Assigned', condition: row.data.condition_at_assignment });
    setMessage('Asset receipt acknowledged.'); await load();
  }

  async function initiateReturn(row: Row) {
    const reason = prompt('Reason for return (minimum 10 characters):');
    if (!reason || reason.trim().length < 10) return setMessage('A return reason of at least 10 characters is required.');
    await fetch('/api/maximus/records', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status: 'endorsed', data: { ...row.data, return_reason: reason.trim(), return_initiated_at: new Date().toISOString() } }),
    });
    setMessage('Asset return initiated.'); await load();
  }

  async function confirmReturn(row: Row) {
    const asset = assets.find(item => item.id === text(row.data.asset_id));
    if (!asset) return;
    const condition = prompt('Return condition: Good and Functional, Good and Non-functional, or Altered', 'Good and Functional');
    if (!condition) return;
    await fetch('/api/maximus/records', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status: 'archived', data: { ...row.data, return_condition: condition, return_date: new Date().toISOString() } }),
    });
    await updateAsset(asset, { ...asset.data, asset_status: 'In Stock', condition, assigned_to_id: '', assigned_to: '' });
    setMessage('Asset return confirmed.'); await load();
  }

  async function recordInventory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAsset) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await createRecord(`Inventory - ${activeAsset.title}`, {
      record_type: 'inventory', asset_id: activeAsset.id, asset_name: activeAsset.title,
      inventory_date: values.inventory_date, condition: values.condition, observation: values.observation,
    });
    await updateAsset(activeAsset, { ...activeAsset.data, condition: values.condition, last_inventory_at: values.inventory_date });
    setDialog(null); setMessage('Inventory record created.'); await load();
  }

  async function writeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAsset) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    await createRecord(`Write-Off - ${activeAsset.title}`, {
      record_type: 'writeoff', asset_id: activeAsset.id, asset_reference: activeAsset.reference,
      asset_name: activeAsset.title, write_off_date: values.write_off_date, reason: writeOffReason,
      loss_circumstances: values.loss_circumstances, staff_in_charge_id: values.staff_in_charge_id,
      management_decision: values.management_decision, amount_to_pay: numeric(values.amount_to_pay),
      disposal_method: disposalMethod, disposal_other: values.disposal_other,
      donation_recipient: values.donation_recipient, comment: values.comment,
    });
    await updateAsset(activeAsset, { ...activeAsset.data, asset_status: 'Written-Off', assigned_to_id: '', assigned_to: '' });
    setDialog(null); setMessage('Asset written off.'); await load();
  }

  const history = activeAsset ? records.filter(row => text(row.data.asset_id) === activeAsset.id && row.data.record_type !== 'asset') : [];

  return <div className="grid gap-5 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">{view !== 'assets' && <button onClick={() => setView('assets')} className="grid h-10 w-10 place-items-center rounded-md border bg-white"><ArrowLeft className="h-4 w-4" /></button>}
        <h2 className="text-3xl font-black">{view === 'assets' ? 'Asset Management' : view === 'assignments' ? 'Asset Assignments' : 'Asset Write-Offs'}</h2></div>
      {view === 'assets' && <div className="flex flex-wrap gap-2"><button onClick={() => setView('assignments')} className="rounded-md border bg-white px-4 py-3 text-sm font-semibold">View Assignments</button>
        <button onClick={() => setView('writeoffs')} className="rounded-md border bg-white px-4 py-3 text-sm font-semibold">View Write-Offs</button>
        <button onClick={() => { setActiveAsset(null); setAssetType('General'); setLocationType('Head Office'); setDialog('asset'); }} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />New Asset</button></div>}
    </div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('required') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}

    {view === 'assets' && <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Asset Register</h3><p className="mt-1 text-sm text-slate-500">A list of all company assets.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input pl-10" placeholder="Search by name, ID, barcode..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <select className="admin-input sm:max-w-44" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="all">All Types</option><option>General</option><option>Vehicle</option><option>Generator</option></select>
        <select className="admin-input sm:max-w-52" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All Statuses</option>{['In Stock','Pending Assignment','Assigned','Written-Off','Under Maintenance','Other'].map(option => <option key={option}>{option}</option>)}</select></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Asset ID</th><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Location</th><th className="p-3">Acquisition Date</th><th className="p-3">Acquisition Cost (FCFA)</th><th className="p-3">Status</th><th className="p-3">Assigned To</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{filteredAssets.length ? filteredAssets.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td><td className="p-3"><p className="font-semibold">{row.title}</p><p className="text-xs text-slate-500">{text(row.data.unique_identifier)}</p></td><td className="p-3">{text(row.data.asset_type)}</td><td className="p-3">{text(row.data.location) || 'N/A'}</td><td className="p-3">{text(row.data.acquisition_date)}</td><td className="p-3">{numeric(row.data.acquisition_value).toLocaleString('fr-FR')}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{text(row.data.asset_status)}</span></td><td className="p-3">{text(row.data.assigned_to) || 'N/A'}</td><td className="p-3"><div className="flex justify-end gap-2">
          <button onClick={() => openDialog('history', row)} title="History" className="rounded-md border p-2"><History className="h-4 w-4" /></button><button onClick={() => openDialog('inventory', row)} title="Record Inventory" className="rounded-md border p-2"><ClipboardCheck className="h-4 w-4" /></button>
          {text(row.data.asset_status) === 'In Stock' && <button onClick={() => openDialog('assign', row)} title="Assign" className="rounded-md border p-2"><Briefcase className="h-4 w-4" /></button>}
          {['In Stock','Assigned'].includes(text(row.data.asset_status)) && <button onClick={() => openDialog('writeoff', row)} title="Write Off" className="rounded-md bg-red-600 p-2 text-white"><MinusCircle className="h-4 w-4" /></button>}
          {text(row.data.asset_status) === 'In Stock' && <button onClick={() => openDialog('asset', row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>}</div></td></tr>) : <tr><td colSpan={9} className="h-28 text-center text-slate-500">No assets found.</td></tr>}</tbody></table></div>
    </section>}

    {view === 'assignments' && <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Assignments Register</h3><p className="mt-1 text-sm text-slate-500">A log of all assets assigned to staff members.</p>
      <div className="mt-5 flex gap-3"><select className="admin-input max-w-64" value={assignmentStatus} onChange={event => setAssignmentStatus(event.target.value)}><option value="all">All Statuses</option><option value="submitted">Pending Staff Acknowledgement</option><option value="validated">Assigned &amp; Acknowledged</option><option value="endorsed">Return Pending</option><option value="archived">Returned</option></select>
        <select className="admin-input max-w-64" value={staffFilter} onChange={event => setStaffFilter(event.target.value)}><option value="all">All Staff</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Assignment ID</th><th className="p-3">Asset ID</th><th className="p-3">Asset Name</th><th className="p-3">Assigned To</th><th className="p-3">Assignment Date</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
        {filteredAssignments.length ? filteredAssignments.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference}</td><td className="p-3 font-mono text-xs">{text(row.data.asset_reference)}</td><td className="p-3 font-semibold">{text(row.data.asset_name)}</td><td className="p-3">{text(row.data.staff_name)}</td><td className="p-3">{text(row.data.assignment_date)}</td><td className="p-3 capitalize">{row.status}</td><td className="p-3 text-right">{row.status === 'submitted' && <button onClick={() => acknowledgeAssignment(row)} className="rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white">Acknowledge Receipt</button>}{row.status === 'validated' && <button onClick={() => initiateReturn(row)} className="rounded-md border px-3 py-2 text-xs font-bold">Initiate Return</button>}{row.status === 'endorsed' && <button onClick={() => confirmReturn(row)} className="rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white">Confirm Return</button>}</td></tr>) : <tr><td colSpan={7} className="h-28 text-center text-slate-500">No asset assignments found.</td></tr>}</tbody></table></div>
    </section>}

    {view === 'writeoffs' && <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Write-Off Registry</h3><p className="mt-1 text-sm text-slate-500">A log of all assets that have been decommissioned.</p>
      <div className="mt-5 flex gap-3"><select className="admin-input max-w-64" value={reasonFilter} onChange={event => setReasonFilter(event.target.value)}><option value="all">All Reasons</option>{['Not Functional','Amortized','Lost','Other'].map(option => <option key={option}>{option}</option>)}</select><select className="admin-input max-w-64" value={disposalFilter} onChange={event => setDisposalFilter(event.target.value)}><option value="all">All Disposal Methods</option>{['Destroyed','Thrown Away','Donated','Other'].map(option => <option key={option}>{option}</option>)}</select></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Asset ID</th><th className="p-3">Asset Name</th><th className="p-3">Write-Off Date</th><th className="p-3">Reason</th><th className="p-3">Disposal Method</th></tr></thead><tbody>{filteredWriteoffs.length ? filteredWriteoffs.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{text(row.data.asset_reference)}</td><td className="p-3 font-semibold">{text(row.data.asset_name)}</td><td className="p-3">{text(row.data.write_off_date)}</td><td className="p-3">{text(row.data.reason)}</td><td className="p-3">{text(row.data.disposal_method) || 'N/A'}</td></tr>) : <tr><td colSpan={5} className="h-28 text-center text-slate-500">No asset write-offs found.</td></tr>}</tbody></table></div>
    </section>}

    {dialog && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDialog(null)}><section className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{dialog === 'asset' ? activeAsset ? 'Edit Asset' : 'Create New Asset' : dialog === 'assign' ? `Assign Asset: ${activeAsset?.title}` : dialog === 'writeoff' ? `Write-Off Asset: ${activeAsset?.title}` : dialog === 'inventory' ? `Record Inventory: ${activeAsset?.title}` : `Asset History: ${activeAsset?.title}`}</h3></div><button onClick={() => setDialog(null)}><X className="h-5 w-5" /></button></header>
      {dialog === 'asset' && <form onSubmit={saveAsset} className="grid max-h-[75vh] gap-5 overflow-y-auto p-6"><label className="grid gap-2 text-sm font-semibold">Asset Name<input className="admin-input" name="name" required minLength={3} defaultValue={activeAsset?.title || ''} /></label><label className="grid gap-2 text-sm font-semibold">Barcode / Unique ID<input className="admin-input" name="unique_identifier" defaultValue={text(activeAsset?.data.unique_identifier)} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Asset Type<select className="admin-input" value={assetType} onChange={event => setAssetType(event.target.value)}><option>General</option><option>Vehicle</option><option>Generator</option></select></label>{assetType === 'Vehicle' && <label className="grid gap-2 text-sm font-semibold">Registration Number<input className="admin-input" name="registration_number" required defaultValue={text(activeAsset?.data.registration_number)} /></label>}{['Vehicle','Generator'].includes(assetType) && <><label className="grid gap-2 text-sm font-semibold">Fuel Type<select className="admin-input" name="fuel_type" required defaultValue={text(activeAsset?.data.fuel_type)}><option value="">Select</option><option>Essence</option><option>Diesel</option></select></label><label className="grid gap-2 text-sm font-semibold">Mileage (km)<input className="admin-input" name="last_mileage" type="number" min="0" defaultValue={numeric(activeAsset?.data.last_mileage)} /></label>{!activeAsset && <label className="grid gap-2 text-sm font-semibold">Initial Fuel (Liters)<input className="admin-input" name="initial_fuel_quantity" type="number" min="0" /></label>}</>}</div>
        <label className="grid gap-2 text-sm font-semibold">Description<textarea className="admin-input min-h-20" name="description" defaultValue={text(activeAsset?.data.description)} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Acquisition Date<input className="admin-input" name="acquisition_date" type="date" required defaultValue={text(activeAsset?.data.acquisition_date)} /></label><label className="grid gap-2 text-sm font-semibold">Acquisition Cost (FCFA)<input className="admin-input" name="acquisition_value" type="number" min="0" required defaultValue={numeric(activeAsset?.data.acquisition_value)} /></label><label className="grid gap-2 text-sm font-semibold">Condition<select className="admin-input" name="condition" required defaultValue={text(activeAsset?.data.condition) || 'Good and Functional'}><option>Good and Functional</option><option>Good and Non-functional</option><option>Altered</option></select></label><label className="grid gap-2 text-sm font-semibold">Amortization (Years)<input className="admin-input" name="amortization_duration" type="number" min="0" defaultValue={numeric(activeAsset?.data.amortization_duration) || 5} /></label><label className="grid gap-2 text-sm font-semibold">Location Type<select className="admin-input" value={locationType} onChange={event => setLocationType(event.target.value)}><option>Head Office</option><option>Central Kitchen</option><option>Sale Point</option></select></label>{locationType !== 'Head Office' && <label className="grid gap-2 text-sm font-semibold">{locationType}<select className="admin-input" name="location_id" required defaultValue={text(activeAsset?.data.location_id)}><option value="">Select location</option>{(locationType === 'Central Kitchen' ? kitchens : salePoints).map(row => <option key={row.id} value={row.id}>{text(row.data.name) || row.title}</option>)}</select></label>}{activeAsset && <label className="grid gap-2 text-sm font-semibold">Status<select className="admin-input" name="asset_status" defaultValue={text(activeAsset.data.asset_status)}>{['In Stock','Assigned','Under Maintenance','Other'].map(option => <option key={option}>{option}</option>)}</select></label>}</div><button disabled={busy} className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : activeAsset ? 'Save Changes' : 'Create Asset'}</button></form>}
      {dialog === 'assign' && <form onSubmit={assign} className="grid gap-5 p-6"><label className="grid gap-2 text-sm font-semibold">Assign To<select className="admin-input" name="staff_id" required><option value="">Select staff member</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Assignment Date<input className="admin-input" name="assignment_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="grid gap-2 text-sm font-semibold">Condition<select className="admin-input" name="condition"><option>Good and Functional</option><option>Good and Non-functional</option><option>Altered</option></select></label><label className="grid gap-2 text-sm font-semibold">Observation<textarea className="admin-input min-h-20" name="observation" /></label><button className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">Assign Asset</button></form>}
      {dialog === 'inventory' && <form onSubmit={recordInventory} className="grid gap-5 p-6"><label className="grid gap-2 text-sm font-semibold">Inventory Date<input className="admin-input" name="inventory_date" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} /></label><label className="grid gap-2 text-sm font-semibold">Condition<select className="admin-input" name="condition" defaultValue={text(activeAsset?.data.condition)}><option>Good and Functional</option><option>Good and Non-functional</option><option>Altered</option></select></label><label className="grid gap-2 text-sm font-semibold">Observation<input className="admin-input" name="observation" /></label><button className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">Submit</button></form>}
      {dialog === 'writeoff' && <form onSubmit={writeOff} className="grid gap-5 p-6"><label className="grid gap-2 text-sm font-semibold">Write-Off Date<input className="admin-input" name="write_off_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label className="grid gap-2 text-sm font-semibold">Reason<select className="admin-input" required value={writeOffReason} onChange={event => setWriteOffReason(event.target.value)} disabled={text(activeAsset?.data.asset_status) === 'Assigned'}><option value="">Select reason</option>{['Not Functional','Amortized','Lost','Other'].map(option => <option key={option}>{option}</option>)}</select></label>{writeOffReason === 'Lost' ? <div className="grid gap-4 rounded-md border p-4"><label className="grid gap-2 text-sm font-semibold">Circumstances of Loss<textarea className="admin-input min-h-20" name="loss_circumstances" required /></label><label className="grid gap-2 text-sm font-semibold">Staff in Charge<select className="admin-input" name="staff_in_charge_id" required><option value="">Select staff</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Management Decision<input className="admin-input" name="management_decision" /></label><label className="grid gap-2 text-sm font-semibold">Amount to Pay (FCFA)<input className="admin-input" name="amount_to_pay" type="number" min="0" /></label></div> : writeOffReason && <div className="grid gap-4 rounded-md border p-4"><label className="grid gap-2 text-sm font-semibold">Disposal Method<select className="admin-input" value={disposalMethod} onChange={event => setDisposalMethod(event.target.value)} required><option value="">Select method</option>{['Destroyed','Thrown Away','Donated','Other'].map(option => <option key={option}>{option}</option>)}</select></label>{disposalMethod === 'Other' && <label className="grid gap-2 text-sm font-semibold">Specify Disposal<input className="admin-input" name="disposal_other" required /></label>}{disposalMethod === 'Donated' && <label className="grid gap-2 text-sm font-semibold">Donation Recipient<input className="admin-input" name="donation_recipient" required /></label>}</div>}<label className="grid gap-2 text-sm font-semibold">Comments<textarea className="admin-input min-h-20" name="comment" /></label><button className="justify-self-end rounded-md bg-red-600 px-5 py-3 text-sm font-bold text-white">Confirm Write-Off</button></form>}
      {dialog === 'history' && <div className="p-6">{history.length ? <div className="grid gap-3">{history.map(row => <article key={row.id} className="rounded-md border p-4"><div className="flex justify-between gap-4"><p className="font-black capitalize">{text(row.data.record_type)}</p><span className="text-xs text-slate-500">{new Date(row.created_at).toLocaleDateString('fr-FR')}</span></div><p className="mt-2 text-sm text-slate-600">{row.title}</p></article>)}</div> : <p className="py-12 text-center text-sm text-slate-500">No history recorded for this asset.</p>}</div>}
    </section></div>}
  </div>;
}
