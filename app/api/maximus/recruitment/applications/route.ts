import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusEvents, localMaximusRecords } from '@/lib/maximus-local-store';
import { resend } from '@/lib/api';

async function context() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get('nutvita_local_admin')?.value !== '1') {
      return { error: NextResponse.json({ message: 'Session administrateur locale requise.' }, { status: 401 }) };
    }
    return { local: true as const, user: { id: 'local-super-admin', email: 'local@nutvita.test' } };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return { error: NextResponse.json({ message: 'Acces refuse.' }, { status: 403 }) };
  return { supabase, user };
}

async function notify(
  supabase: Awaited<ReturnType<typeof createClient>>,
  application: Record<string, any>,
  title: string,
  message: string,
  actionUrl?: string,
) {
  await supabase.from('maximus_candidate_notifications').insert({
    candidate_id: application.candidate_id,
    application_id: application.id,
    title,
    message,
    action_url: actionUrl || null,
  });
  if (!application.email) return;
  try {
    await resend('/emails', {
      from: process.env.MAIL_FROM ?? 'NutVitaGlobalis <contact@nutvitaglobalis.com>',
      to: [application.email],
      subject: title,
      text: `Bonjour ${application.full_name || 'Candidat'},\n\n${message}\n\n${actionUrl ? `Acceder a votre espace : ${actionUrl}\n\n` : ''}Equipe NutVitaGlobalis`,
    });
  } catch (error) {
    console.error('Maximus staff recruitment email', error);
  }
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  if ('local' in ctx && ctx.local) {
    const rows = localMaximusRecords().filter(row => row.module === 'hr/recruitment/applications').reverse();
    const offers = localMaximusRecords().filter(row => row.module === 'hr/recruitment/offers');
    return NextResponse.json({
      items: rows.map(row => ({
        id: row.id, offer_id: row.data.offer_id, full_name: row.data.candidate_name,
        email: row.data.email, phone: row.data.phone, status: row.data.stage || row.status,
        written_test_score: row.data.score, interview_score: row.data.interview_score,
        submitted_at: row.created_at, documents: row.data.documents || {},
        maximus_job_offers: offers.find(offer => offer.id === row.data.offer_id),
      })),
      tests: localMaximusRecords().filter(row => row.module === 'hr/recruitment/tests' && row.status === 'validated'),
    });
  }
  const [{ data, error }, { data: tests }] = await Promise.all([
    ctx.supabase.from('maximus_staff_applications')
      .select('*,maximus_job_offers(id,reference,title,department,location,contract_type),maximus_test_assignments(id,status,final_score,maximus_written_tests(id,title))')
      .order('created_at', { ascending: false }),
    ctx.supabase.from('maximus_written_tests').select('id,offer_id,title,duration_minutes,pass_score,status').eq('status', 'validated').order('created_at', { ascending: false }),
  ]);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const items = await Promise.all((data || []).map(async application => {
    const documents = application.documents && typeof application.documents === 'object' ? application.documents : {};
    const signedDocuments: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(documents)) {
      const document = value as { path?: string; name?: string };
      if (!document.path) continue;
      const { data: signed } = await ctx.supabase.storage.from('maximus-recruitment').createSignedUrl(document.path, 3600);
      signedDocuments[key] = { ...document, url: signed?.signedUrl || null };
    }
    return { ...application, documents: signedDocuments };
  }));
  return NextResponse.json({ items, tests: tests || [] });
}

export async function PATCH(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  const id = String(body.id || '');
  const action = String(body.action || '');
  if (!id) return NextResponse.json({ message: 'Candidature requise.' }, { status: 400 });
  if ('local' in ctx && ctx.local) {
    const row = localMaximusRecords().find(item => item.id === id && item.module === 'hr/recruitment/applications');
    if (!row) return NextResponse.json({ message: 'Candidature introuvable.' }, { status: 404 });
    const from = String(row.data.stage || row.status);
    const next = action === 'review' ? 'under_review' : action === 'invite_test' ? 'invited_to_test' : action === 'reject' ? 'rejected' : '';
    if (!next) return NextResponse.json({ message: 'Action invalide.' }, { status: 400 });
    row.data = { ...row.data, stage: next, decision_note: body.note || null, selected_test_ids: body.test_ids || [] };
    row.updated_at = new Date().toISOString();
    localMaximusEvents().push({ id: crypto.randomUUID(), source_record_id: id, action, details: { from_status: from, to_status: next }, created_at: new Date().toISOString() });
    return NextResponse.json({ item: row });
  }
  const { data: application } = await ctx.supabase.from('maximus_staff_applications').select('*,maximus_job_offers(id,title)').eq('id', id).single();
  if (!application) return NextResponse.json({ message: 'Candidature introuvable.' }, { status: 404 });
  const testIds = Array.isArray(body.test_ids) ? body.test_ids.map(String).filter(Boolean) : [];
  let nextStatus = '';
  let title = '';
  let message = '';
  if (action === 'review') {
    nextStatus = 'under_review';
    title = 'Candidature en cours d analyse';
    message = `Votre candidature au poste de ${application.maximus_job_offers?.title || 'Staff'} est en cours d analyse.`;
  } else if (action === 'invite_test') {
    if (!testIds.length) return NextResponse.json({ message: 'Selectionnez au moins une epreuve validee.' }, { status: 400 });
    const { data: validTests } = await ctx.supabase.from('maximus_written_tests').select('id,title,proctoring_mode').in('id', testIds).eq('offer_id', application.offer_id).eq('status', 'validated');
    if (!validTests?.length || validTests.length !== testIds.length) return NextResponse.json({ message: 'Une epreuve selectionnee est invalide ou ne correspond pas a cette offre.' }, { status: 400 });
    const { error: assignmentError } = await ctx.supabase.from('maximus_test_assignments').upsert(validTests.map(test => ({
      test_id: test.id,
      application_id: id,
      sent_by: ctx.user.id,
      status: 'sent',
      proctor_room: test.proctoring_mode === 'live' ? `NVG-PROCTOR-${test.id.replaceAll('-', '').slice(0, 12).toUpperCase()}-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}` : null,
    })), { onConflict: 'test_id,application_id' });
    if (assignmentError) return NextResponse.json({ message: assignmentError.message }, { status: 400 });
    nextStatus = 'invited_to_test';
    title = 'Invitation au test ecrit';
    message = `${validTests.length} epreuve(s) pour le poste de ${application.maximus_job_offers?.title || 'Staff'} sont disponibles dans votre espace candidat.`;
  } else if (action === 'reject') {
    nextStatus = 'rejected';
    title = 'Suite donnee a votre candidature';
    message = String(body.note || '').trim() || `Nous vous remercions sincerement pour votre candidature. Nous ne poursuivrons pas ce processus avec votre profil, mais vous invitons a rester connecte et a postuler a nos prochaines offres.`;
  } else {
    return NextResponse.json({ message: 'Action invalide.' }, { status: 400 });
  }
  const { data, error } = await ctx.supabase.from('maximus_staff_applications').update({
    status: nextStatus,
    decision_note: action === 'reject' ? String(body.note || '') : application.decision_note,
  }).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await ctx.supabase.from('maximus_recruitment_events').insert({
    process_type: 'staff',
    offer_id: application.offer_id,
    staff_application_id: id,
    event_type: action,
    from_status: application.status,
    to_status: nextStatus,
    details: { test_ids: testIds, note: body.note || null },
    actor_id: ctx.user.id,
    actor_email: ctx.user.email,
  });
  const actionUrl = `${process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin}/staff-candidat`;
  await notify(ctx.supabase, application, title, message, actionUrl);
  return NextResponse.json({ item: data });
}
