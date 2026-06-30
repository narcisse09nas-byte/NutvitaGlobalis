import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const transitions: Record<string, string[]> = {
  draft: ['submitted'], submitted: ['endorsed', 'rejected'], endorsed: ['validated', 'rejected'],
  validated: ['published'], published: ['closed'], rejected: ['draft'], closed: ['archived'], archived: [],
};

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return { error: NextResponse.json({ message: 'Acces Partenariats requis.' }, { status: 403 }) };
  return { supabase, user };
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const [{ data: calls }, { data: applications }, { data: visits }] = await Promise.all([
    ctx.supabase.from('maximus_vendor_calls').select('*').order('created_at', { ascending: false }),
    ctx.supabase.from('maximus_vendor_applications').select('*,maximus_vendor_calls(title,reference,category),maximus_vendor_site_visits(*)').order('created_at', { ascending: false }),
    ctx.supabase.from('maximus_vendor_site_visits').select('*,maximus_vendor_applications(company_name,email,maximus_vendor_calls(title,reference))').order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({ calls: calls || [], applications: applications || [], visits: visits || [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  if (body.action === 'create_call') {
    const { data, error } = await ctx.supabase.from('maximus_vendor_calls').insert({
      reference: `V${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`,
      title: String(body.title || ''),
      category: String(body.category || ''),
      service_area: String(body.service_area || ''),
      requirements: String(body.requirements || ''),
      terms_of_reference: String(body.terms_of_reference || ''),
      closing_at: body.closing_at || null,
      created_by: ctx.user.id,
    }).select('*').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ item: data });
  }
  if (body.action === 'plan_visit') {
    const { data, error } = await ctx.supabase.from('maximus_vendor_site_visits').insert({
      application_id: body.application_id,
      scheduled_at: body.scheduled_at || null,
      inspectors: String(body.inspectors || '').split(/[\n,;]+/).map((value: string) => value.trim()).filter(Boolean),
      location: String(body.location || ''),
      checklist: String(body.checklist || '').split(/\n+/).map((value: string) => ({ item: value.trim(), result: null })).filter((item: { item: string }) => item.item),
      created_by: ctx.user.id,
    }).select('*').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await ctx.supabase.from('maximus_vendor_applications').update({ status: 'site_visit_planned' }).eq('id', body.application_id);
    return NextResponse.json({ item: data });
  }
  return NextResponse.json({ message: 'Action invalide.' }, { status: 400 });
}

export async function PATCH(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  if (body.action === 'transition_call') {
    const { data: call } = await ctx.supabase.from('maximus_vendor_calls').select('*').eq('id', body.id).single();
    const next = String(body.status || '');
    if (!call || !transitions[call.status]?.includes(next)) return NextResponse.json({ message: 'Transition interdite.' }, { status: 400 });
    const { error } = await ctx.supabase.from('maximus_vendor_calls').update({ status: next, published_at: next === 'published' ? new Date().toISOString() : call.published_at }).eq('id', call.id);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'complete_visit') {
    const score = Number(body.score);
    if (score < 0 || score > 100) return NextResponse.json({ message: 'Score invalide.' }, { status: 400 });
    const { data: visit, error } = await ctx.supabase.from('maximus_vendor_site_visits').update({
      completed_at: new Date().toISOString(), findings: String(body.findings || ''), score,
      recommendation: body.recommendation, report_path: body.report_path || null, status: 'completed',
    }).eq('id', body.id).select('application_id').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await ctx.supabase.from('maximus_vendor_applications').update({ status: 'site_visit_completed' }).eq('id', visit.application_id);
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'decide_application') {
    const status = body.decision === 'approve' ? 'approved' : 'rejected';
    const { data: application, error } = await ctx.supabase.from('maximus_vendor_applications').update({ status, decision_note: String(body.note || '') }).eq('id', body.id).select('call_id').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await ctx.supabase.from('maximus_recruitment_events').insert({ process_type: 'vendor', vendor_application_id: body.id, event_type: `vendor_${status}`, to_status: status, details: { call_id: application.call_id, note: body.note }, actor_id: ctx.user.id, actor_email: ctx.user.email });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ message: 'Action invalide.' }, { status: 400 });
}
