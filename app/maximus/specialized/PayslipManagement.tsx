'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, FileCheck, Plus, ShieldCheck, ShieldX, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

type PayItem = { name: string; amount: number };
const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => Number(value || 0);

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;
}

function parseItems(value: string): PayItem[] {
  return value.split(/\r?\n/).map(line => {
    const [name, rawAmount] = line.split('|').map(part => part.trim());
    return { name, amount: number(rawAmount) };
  }).filter(row => row.name && row.amount);
}

export default function PayslipManagement() {
  const [records, setRecords] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [salaryGrid, setSalaryGrid] = useState<Row[]>([]);
  const [dialog, setDialog] = useState<'generate' | 'components' | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [baseSalary, setBaseSalary] = useState(0);
  const [earningsText, setEarningsText] = useState('');
  const [deductionsText, setDeductionsText] = useState('');
  const [contributionsText, setContributionsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [payrollResponse, staffResponse, salaryResponse] = await Promise.all([
      fetch('/api/maximus/records?module=hr%2Fpayroll'),
      fetch('/api/maximus/records?module=hr%2Fstaff'),
      fetch('/api/maximus/records?module=hr%2Fsalary-grid'),
    ]);
    const payrollPayload = await payrollResponse.json();
    const staffPayload = await staffResponse.json();
    const salaryPayload = await salaryResponse.json();
    if (!payrollResponse.ok) throw new Error(payrollPayload.message || 'Unable to load payslips.');
    setRecords(payrollPayload.items || []);
    setStaff(staffResponse.ok ? staffPayload.items || [] : []);
    setSalaryGrid(salaryResponse.ok ? salaryPayload.items || [] : []);
  }

  useEffect(() => { load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load payslips.')); }, []);

  const payslips = records.filter(row => !row.data.record_type || row.data.record_type === 'payslip');
  const components = records.filter(row => row.data.record_type === 'component');
  const selectedEmployee = staff.find(row => row.id === employeeId);

  useEffect(() => {
    if (!selectedEmployee) return setBaseSalary(0);
    const salary = salaryGrid.find(row =>
      text(row.data.grade) === text(selectedEmployee.data.grade) &&
      text(row.data.step) === text(selectedEmployee.data.step)
    );
    setBaseSalary(number(salary?.data.base_salary || selectedEmployee.data.base_salary));
  }, [employeeId, selectedEmployee, salaryGrid]);

  useEffect(() => {
    if (!selectedEmployee) {
      setEarningsText('');
      setDeductionsText('');
      setContributionsText('');
      return;
    }
    const applicable = components.filter(row => {
      const grades = Array.isArray(row.data.applies_to) ? row.data.applies_to.map(String) : [];
      return !grades.length || grades.includes(text(selectedEmployee.data.grade));
    });
    const calculated = (type: string) => applicable.filter(row => text(row.data.component_type) === type).map(row => {
      const value = text(row.data.calculation_type) === 'percentage_base'
        ? baseSalary * number(row.data.value) / 100
        : number(row.data.value);
      return `${row.title} | ${value}`;
    }).join('\n');
    setEarningsText(calculated('Earning'));
    setDeductionsText(calculated('Deduction'));
    setContributionsText(calculated('Employer Contribution'));
  }, [selectedEmployee, components, baseSalary]);

  const earnings = parseItems(earningsText);
  const deductions = parseItems(deductionsText);
  const contributions = parseItems(contributionsText);
  const totalEarnings = baseSalary + earnings.reduce((sum, row) => sum + row.amount, 0);
  const totalDeductions = deductions.reduce((sum, row) => sum + row.amount, 0);
  const totalContributions = contributions.reduce((sum, row) => sum + row.amount, 0);
  const netPay = totalEarnings - totalDeductions;

  async function savePayslip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmployee) return;
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payPeriod = text(values.pay_period);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'hr/payroll',
        title: `${staffName(selectedEmployee)} - ${payPeriod}`,
        data: {
          record_type: 'payslip',
          employee: selectedEmployee.id,
          employee_name: staffName(selectedEmployee),
          pay_period: payPeriod,
          pay_date: new Date().toISOString().slice(0, 10),
          retrospective: values.retrospective === 'on',
          grade: selectedEmployee.data.grade,
          step: selectedEmployee.data.step,
          position: selectedEmployee.data.position,
          contract_type: selectedEmployee.data.contract_type,
          base_salary: baseSalary,
          earnings,
          deductions,
          employer_contributions: contributions,
          total_earnings: totalEarnings,
          total_deductions: totalDeductions,
          total_employer_contributions: totalContributions,
          net_pay: netPay,
        },
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to generate payslip.');
    setDialog(null);
    setEmployeeId('');
    setMessage('Payslip generated and saved as draft.');
    await load();
  }

  async function saveComponent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'hr/payroll',
        title: values.name,
        data: {
          record_type: 'component',
          component_type: values.component_type,
          calculation_type: values.calculation_type,
          value: number(values.value),
          applies_to: text(values.applies_to).split(',').map(value => value.trim()).filter(Boolean),
        },
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save component.');
    setMessage('Payslip component added.');
    await load();
  }

  async function changeStatus(row: Row, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) return setMessage('Unable to update payslip status.');
    await load();
  }

  async function removeComponent(row: Row) {
    await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    await load();
  }

  const statusLabel = (row: Row) => ({ draft: 'Draft', endorsed: 'Endorsed', validated: 'Validated', rejected: 'Rejected', paid: 'Paid' }[row.status] || row.status);

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center justify-between gap-4"><h2 className="text-3xl font-black">Payslip Management</h2><button onClick={() => setDialog('generate')} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Generate Payslip</button></div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">Payslip Generation &amp; History</h3><p className="mt-1 text-sm text-slate-500">Generate new payslips for employees and view a history of all generated payslips.</p></div><button onClick={() => setDialog('components')} className="rounded-md border px-3 py-2 text-xs font-bold">Payslip Components</button></div>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Pay Period</th><th className="p-3">Staff Member</th><th className="p-3">Net Pay (FCFA)</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{payslips.length ? payslips.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.pay_period)}</td><td className="p-3">{text(row.data.employee_name) || row.title}</td><td className="p-3">{number(row.data.net_pay).toLocaleString('fr-FR')}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabel(row)}</span></td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setViewing(row)} className="flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-bold"><Eye className="h-4 w-4" />View</button>{row.status === 'draft' && <button onClick={() => changeStatus(row, 'endorsed')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><ShieldCheck className="h-4 w-4" />Endorse</button>}{row.status === 'endorsed' && <button onClick={() => changeStatus(row, 'validated')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><FileCheck className="h-4 w-4" />Validate</button>}{!['draft', 'rejected'].includes(row.status) && <button onClick={() => changeStatus(row, 'rejected')} className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white"><ShieldX className="h-4 w-4" />Reject</button>}{row.status === 'validated' && <button onClick={() => changeStatus(row, 'paid')} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white">Mark Paid</button>}</div></td></tr>) : <tr><td colSpan={5} className="h-28 text-center text-slate-500">No payslips generated yet.</td></tr>}</tbody></table></div>
    </section>

    {dialog === 'generate' && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDialog(null)}><section className="mx-auto my-5 w-full max-w-6xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">Generate Payslip</h3><p className="mt-1 text-sm text-slate-500">Select the employee, period and payroll components.</p></div><button onClick={() => setDialog(null)}><X className="h-5 w-5" /></button></header><form onSubmit={savePayslip} className="grid gap-6 p-6 lg:grid-cols-[1fr_1.5fr]">
      <div className="grid content-start gap-5"><label className="grid gap-2 text-sm font-semibold">Staff Member<select className="admin-input" value={employeeId} onChange={event => setEmployeeId(event.target.value)} required><option value="">Select a staff member...</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Pay Period<input className="admin-input" name="pay_period" type="month" required defaultValue={new Date().toISOString().slice(0, 7)} /></label><label className="flex items-center justify-between rounded-md border p-4 text-sm font-semibold"><span>Retrospective Payslip</span><input name="retrospective" type="checkbox" /></label>{selectedEmployee && <><label className="grid gap-2 text-sm font-semibold">Base Salary (FCFA)<input className="admin-input" type="number" min="0" value={baseSalary} onChange={event => setBaseSalary(number(event.target.value))} /></label><label className="grid gap-2 text-sm font-semibold">Earnings<span className="text-xs font-normal text-slate-500">One line: Name | Amount</span><textarea className="admin-input min-h-28" value={earningsText} onChange={event => setEarningsText(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Deductions<textarea className="admin-input min-h-28" value={deductionsText} onChange={event => setDeductionsText(event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Employer Contributions<textarea className="admin-input min-h-28" value={contributionsText} onChange={event => setContributionsText(event.target.value)} /></label></>}</div>
      <div className="min-h-[600px] rounded-md border p-6">{selectedEmployee ? <div className="grid gap-5"><h4 className="text-center text-xl font-black">PAYSLIP</h4><div className="flex justify-between border-b pb-4"><div><p className="font-black">Nutvita Globalis</p><p className="text-sm text-slate-500">Employee Payslip</p></div><div className="text-right text-sm"><p className="font-bold">{staffName(selectedEmployee)}</p><p>{text(selectedEmployee.data.position)}</p><p>{text(selectedEmployee.data.grade)} / {text(selectedEmployee.data.step)}</p></div></div><div className="grid gap-6 md:grid-cols-2"><PayTable title="Earnings" baseSalary={baseSalary} rows={earnings} total={totalEarnings} /><PayTable title="Deductions" rows={deductions} total={totalDeductions} /></div><p className="border-t pt-5 text-right text-xl font-black">NET PAY: {netPay.toLocaleString('fr-FR')} FCFA</p><PayTable title="Employer Contributions" rows={contributions} total={totalContributions} /><button disabled={busy} className="justify-self-end rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Generating...' : 'Generate & Save'}</button></div> : <div className="grid h-full place-items-center text-sm text-slate-500">Select a staff member to start.</div>}</div>
    </form></section></div>}

    {dialog === 'components' && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setDialog(null)}><section className="w-full max-w-4xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><h3 className="text-2xl font-black">Payslip Component Library</h3><button onClick={() => setDialog(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6 md:grid-cols-[1fr_1.3fr]"><form onSubmit={saveComponent} className="grid content-start gap-4"><label className="grid gap-2 text-sm font-semibold">Component Name<input className="admin-input" name="name" required /></label><label className="grid gap-2 text-sm font-semibold">Type<select className="admin-input" name="component_type"><option>Earning</option><option>Deduction</option><option>Employer Contribution</option></select></label><label className="grid gap-2 text-sm font-semibold">Calculation<select className="admin-input" name="calculation_type"><option value="fixed">Fixed Amount</option><option value="percentage_base">Percentage of Base Salary</option><option value="manual">Manual Input</option></select></label><label className="grid gap-2 text-sm font-semibold">Value<input className="admin-input" name="value" type="number" min="0" /></label><label className="grid gap-2 text-sm font-semibold">Applies To Grades<input className="admin-input" name="applies_to" placeholder="Grade 1, Grade 2" /></label><button disabled={busy} className="rounded-md bg-[#24945f] px-4 py-3 text-sm font-bold text-white">Save Component</button></form><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Component</th><th className="p-3">Type</th><th className="p-3">Value</th><th className="p-3"></th></tr></thead><tbody>{components.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{row.title}</td><td className="p-3">{text(row.data.component_type)}</td><td className="p-3">{number(row.data.value).toLocaleString('fr-FR')}</td><td className="p-3 text-right"><button onClick={() => removeComponent(row)} className="text-xs font-bold text-red-700">Delete</button></td></tr>)}</tbody></table></div></div></section></div>}

    {viewing && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="w-full max-w-3xl rounded-lg bg-white p-7" onMouseDown={event => event.stopPropagation()}><div className="flex justify-between"><div><h3 className="text-2xl font-black">Payslip</h3><p className="mt-1 text-sm text-slate-500">{text(viewing.data.employee_name)} - {text(viewing.data.pay_period)}</p></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></div><div className="mt-7 grid gap-6 md:grid-cols-2"><PayTable title="Earnings" baseSalary={number(viewing.data.base_salary)} rows={(viewing.data.earnings as PayItem[]) || []} total={number(viewing.data.total_earnings)} /><PayTable title="Deductions" rows={(viewing.data.deductions as PayItem[]) || []} total={number(viewing.data.total_deductions)} /></div><p className="mt-6 border-t pt-5 text-right text-xl font-black">NET PAY: {number(viewing.data.net_pay).toLocaleString('fr-FR')} FCFA</p></section></div>}
  </div>;
}

function PayTable({ title, rows, total, baseSalary }: { title: string; rows: PayItem[]; total: number; baseSalary?: number }) {
  return <div><h5 className="mb-2 font-black">{title}</h5><table className="w-full text-sm"><tbody>{baseSalary !== undefined && <tr className="border-b"><td className="py-2">Base Salary</td><td className="py-2 text-right">{baseSalary.toLocaleString('fr-FR')}</td></tr>}{rows.map((row, index) => <tr key={`${row.name}-${index}`} className="border-b"><td className="py-2">{row.name}</td><td className="py-2 text-right">{number(row.amount).toLocaleString('fr-FR')}</td></tr>)}</tbody><tfoot><tr><th className="pt-3 text-left">Total</th><th className="pt-3 text-right">{total.toLocaleString('fr-FR')}</th></tr></tfoot></table></div>;
}
