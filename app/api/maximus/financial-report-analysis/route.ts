import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { generateStructured } from '@/lib/ai-narrative';
import { requireMaximusApi } from '@/lib/maximus-api-auth';

type Narrative = {
  executive_summary: string;
  findings: string[];
  risks: string[];
  recommendations: string[];
  conclusion: string;
};

async function authorized() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    return (await cookies()).get('nutvita_local_admin')?.value === '1';
  }
  const ctx = await requireMaximusApi('finance/reports', 'viewer');
  return !('error' in ctx);
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ message: 'Accès Maximus requis.' }, { status: 401 });
  const body = await request.json();
  const totals = body.totals && typeof body.totals === 'object' ? body.totals : null;
  if (!totals || !body.period?.from || !body.period?.to) {
    return NextResponse.json({ message: 'Données financières incomplètes.' }, { status: 400 });
  }

  const fallback: Narrative = {
    executive_summary: `For the selected period, recorded revenue is ${Number(totals.revenue || 0).toLocaleString('fr-FR')} FCFA and executed expenditure is ${Number(totals.expense || 0).toLocaleString('fr-FR')} FCFA. The resulting net balance is ${Number(totals.net || 0).toLocaleString('fr-FR')} FCFA.`,
    findings: ['The report reflects only validated or executed records available in Maximus.'],
    risks: Number(totals.pending_commitments || 0) > 0 ? ['Validated commitments remain outside executed expenditure and require cash-flow monitoring.'] : [],
    recommendations: ['Reconcile supporting documents, bank movements, petty cash, and accounting entries before formal approval.'],
    conclusion: 'This deterministic summary should be reviewed and signed by Finance and Management.',
  };

  const generated = await generateStructured<Narrative>(
    'maximus_financial_report_narrative',
    [
      'Act as a rigorous financial controller for a food-service and consulting organization.',
      'Use only the supplied deterministic figures. Never modify, recompute, invent, or contradict an amount.',
      'Distinguish recorded revenue, executed expenditure, net cash flow, validated commitments, pending requests, advances, and accounting controls.',
      'Explain significant concentrations, unusual movements, incomplete evidence, cash-flow exposure, and reconciliation priorities.',
      'Do not claim fraud, compliance, audit assurance, or accounting certification.',
      'Provide a substantial executive summary, precise findings, prioritized risks, actionable recommendations, and a balanced conclusion.',
      'If the dataset is empty or incomplete, state exactly which interpretation is impossible and what evidence is required.',
      'Output in English, matching the Financial Reports interface.',
    ].join('\n'),
    {
      period: body.period,
      totals,
      monthly_breakdown: body.monthly_breakdown || [],
      budget_breakdown: body.budget_breakdown || [],
      status_summary: body.status_summary || {},
      accounting_control: body.accounting_control || {},
      data_limitations: body.data_limitations || [],
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        executive_summary: { type: 'string' },
        findings: { type: 'array', items: { type: 'string' } },
        risks: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
        conclusion: { type: 'string' },
      },
      required: ['executive_summary', 'findings', 'risks', 'recommendations', 'conclusion'],
    },
  );

  return NextResponse.json({
    narrative: generated.data || fallback,
    provider: generated.provider || 'local',
    ai_error: generated.error,
  });
}
