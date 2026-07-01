import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStructured } from '@/lib/ai-narrative';
import { requireMaximusApi } from '@/lib/maximus-api-auth';

type Narrative = {
  executive_summary: string;
  process_overview: string;
  chronology_analysis: string;
  fairness_and_transparency: string;
  incidents_and_explanations: string;
  decisions_and_evidence: string;
  recommendations: string[];
  conclusion: string;
};

async function context(required: 'viewer' | 'creator') {
  return requireMaximusApi('hr/recruitment/audit', required);
}

export async function GET() {
  const ctx = await context('viewer');
  if ('error' in ctx) return ctx.error;
  const [{ data: staff }, { data: vendors }, { data: reports }] = await Promise.all([
    ctx.supabase.from('maximus_job_offers').select('id,reference,title,status,created_at,published_at').order('created_at', { ascending: false }),
    ctx.supabase.from('maximus_vendor_calls').select('id,reference,title,status,created_at,published_at').order('created_at', { ascending: false }),
    ctx.supabase.from('maximus_recruitment_audit_reports').select('*').order('generated_at', { ascending: false }),
  ]);
  return NextResponse.json({ staff: staff || [], vendors: vendors || [], reports: reports || [] });
}

export async function POST(request: Request) {
  const ctx = await context('creator');
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  const processType = body.process_type === 'vendor' ? 'vendor' : 'staff';
  const processId = String(body.process_id || '');
  const scope = body.report_scope === 'final' ? 'final' : 'progress';
  if (!processId) return NextResponse.json({ message: 'Processus requis.' }, { status: 400 });

  const processQuery = processType === 'staff'
    ? ctx.supabase.from('maximus_job_offers').select('*').eq('id', processId).single()
    : ctx.supabase.from('maximus_vendor_calls').select('*').eq('id', processId).single();
  const { data: process } = await processQuery;
  if (!process) return NextResponse.json({ message: 'Processus introuvable.' }, { status: 404 });
  const applications = processType === 'staff'
    ? (await ctx.supabase.from('maximus_staff_applications').select('id,full_name,email,status,written_test_score,interview_score,final_score,created_at,updated_at,maximus_test_assignments(id,status,automatic_score,final_score,proctoring_summary,maximus_proctoring_events(event_type,severity,created_at,details)),maximus_recruitment_interviews(status,scheduled_at,maximus_interview_evaluations(overall_score,recommendation,submitted_at)),maximus_employment_proposals(status,responded_at)').eq('offer_id', processId)).data
    : (await ctx.supabase.from('maximus_vendor_applications').select('id,company_name,email,status,decision_note,created_at,updated_at,maximus_vendor_site_visits(status,scheduled_at,completed_at,score,recommendation,findings,report_path)').eq('call_id', processId)).data;
  const eventResult = processType === 'staff'
    ? await ctx.supabase.from('maximus_recruitment_events').select('*').eq('process_type', 'staff').eq('offer_id', processId).order('created_at')
    : await ctx.supabase.from('maximus_recruitment_events').select('*').eq('process_type', 'vendor').in('vendor_application_id', (applications || []).map(item => item.id)).order('created_at');
  const events = eventResult.data || [];
  const structured = { process_type: processType, report_scope: scope, process, applications: applications || [], events: events || [], generated_at: new Date().toISOString() };
  const result = await generateStructured<Narrative>(
    'maximus_recruitment_audit',
    'Redige en francais un rapport d audit de recrutement factuel, complet, chronologique et neutre. Distingue faits, scores, incidents techniques et decisions humaines. Ne conclus jamais a une fraude a partir d un signal de surveillance seul. Mentionne les donnees manquantes et les elements N/A. Identifie les acteurs et dates disponibles. Fournis des recommandations de controle interne.',
    structured,
    {
      type: 'object',
      properties: {
        executive_summary: { type: 'string' }, process_overview: { type: 'string' }, chronology_analysis: { type: 'string' },
        fairness_and_transparency: { type: 'string' }, incidents_and_explanations: { type: 'string' },
        decisions_and_evidence: { type: 'string' }, recommendations: { type: 'array', items: { type: 'string' } }, conclusion: { type: 'string' },
      },
      required: ['executive_summary','process_overview','chronology_analysis','fairness_and_transparency','incidents_and_explanations','decisions_and_evidence','recommendations','conclusion'],
    },
  );
  const fallback: Narrative = {
    executive_summary: `Rapport ${scope === 'final' ? 'final' : 'de progression'} du processus ${process.reference} - ${process.title}.`,
    process_overview: `${applications?.length || 0} dossier(s) sont enregistres. Le statut du processus est ${process.status}.`,
    chronology_analysis: `${events?.length || 0} evenement(s) d audit ont ete enregistres et sont conserves dans les donnees structurees.`,
    fairness_and_transparency: 'Les decisions doivent etre validees par un responsable humain et justifiees par des elements professionnels pertinents.',
    incidents_and_explanations: 'Les incidents techniques ou signaux de surveillance ne constituent pas seuls une preuve de fraude.',
    decisions_and_evidence: 'Consulter les dossiers, scores, rapports de visite ou evaluations joints aux donnees structurees.',
    recommendations: ['Verifier les justifications des decisions.', 'Documenter les ecarts et les reponses des candidats.', 'Limiter l acces aux donnees sensibles.'],
    conclusion: 'Le present rapport preserve la chronologie disponible et doit etre complete par toute piece justificative manquante.',
  };
  const narrative = result.data || fallback;
  const { data, error } = await ctx.supabase.from('maximus_recruitment_audit_reports').insert({
    process_type: processType, process_id: processId, report_scope: scope,
    period_start: process.created_at, period_end: new Date().toISOString(),
    structured_data: structured, ai_narrative: narrative, provider: result.provider || 'local',
    model: result.provider ? process.env[`${result.provider.toUpperCase()}_MODEL`] || null : null,
    generated_by: ctx.user.id,
  }).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}
