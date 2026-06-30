import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { hasLocalAdminMode, hasSupabaseConfig } from '@/lib/supabase/config';
import { localMaximusEvents, localMaximusRecords } from '@/lib/maximus-local-store';
import { resend } from '@/lib/api';

type TestStatus = 'draft' | 'submitted' | 'endorsed' | 'validated' | 'rejected' | 'archived';
const transitions: Record<TestStatus, TestStatus[]> = {
  draft: ['submitted'],
  submitted: ['endorsed', 'rejected'],
  endorsed: ['validated', 'rejected'],
  validated: ['archived'],
  rejected: ['draft'],
  archived: [],
};
const questionTypes = new Set(['single_choice', 'multiple_choice', 'open', 'file_upload']);
const proctoringModes = new Set(['none', 'activity', 'live']);

function proctoringConfig(body: Record<string, unknown>) {
  const mode = proctoringModes.has(String(body.proctoring_mode)) ? String(body.proctoring_mode) : 'activity';
  return {
    proctoring_mode: mode,
    require_camera: mode === 'live' && body.require_camera !== false,
    require_screen_share: mode === 'live' && body.require_screen_share !== false,
    track_tab_switches: mode !== 'none' && body.track_tab_switches !== false,
    track_disconnects: mode !== 'none' && body.track_disconnects !== false,
    track_audio_activity: mode !== 'none' && body.track_audio_activity === true,
    track_face_presence: mode !== 'none' && body.track_face_presence === true,
    proctoring_consent_text: String(body.proctoring_consent_text || '').trim() || null,
  };
}

async function context() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get('nutvita_local_admin')?.value !== '1') return { error: NextResponse.json({ message: 'Session locale requise.' }, { status: 401 }) };
    return { local: true as const, user: { id: 'local-super-admin', email: 'local@nutvita.test' } };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  const { data: admin } = await supabase.from('admin_users').select('role,active').eq('id', user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return { error: NextResponse.json({ message: 'Acces refuse.' }, { status: 403 }) };
  return { supabase, user };
}

function normalizedQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const type = String(item.question_type || '');
    if (!questionTypes.has(type)) throw new Error(`Type invalide pour la question ${index + 1}.`);
    const prompt = String(item.prompt || '').trim();
    if (!prompt) throw new Error(`Le texte de la question ${index + 1} est obligatoire.`);
    const options = Array.isArray(item.options) ? item.options.map(String).map(option => option.trim()).filter(Boolean) : [];
    if (['single_choice', 'multiple_choice'].includes(type) && options.length < 2) throw new Error(`La question ${index + 1} requiert au moins deux choix.`);
    return {
      question_type: type,
      prompt,
      help_text: String(item.help_text || '').trim() || null,
      options,
      correct_answers: Array.isArray(item.correct_answers) ? item.correct_answers.map(String) : [],
      required: item.required !== false,
      points: Math.max(Number(item.points || 1), 0),
      max_words: type === 'open' ? Number(item.max_words || 0) || null : null,
      allowed_mime_types: type === 'file_upload' ? (Array.isArray(item.allowed_mime_types) ? item.allowed_mime_types : ['application/pdf']) : null,
      max_file_size_mb: type === 'file_upload' ? Math.min(Math.max(Number(item.max_file_size_mb || 10), 1), 15) : null,
      position: index + 1,
    };
  });
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  if ('local' in ctx && ctx.local) {
    const offers = localMaximusRecords().filter(row => row.module === 'hr/recruitment/offers');
    const tests = localMaximusRecords().filter(row => row.module === 'hr/recruitment/tests').reverse().map(row => ({
      id: row.id, offer_id: row.data.offer_id, title: row.title, instructions: row.data.instructions,
      duration_minutes: row.data.duration_minutes, pass_score: row.data.pass_score, status: row.status,
      proctoring_mode: row.data.proctoring_mode || 'activity', require_camera: Boolean(row.data.require_camera),
      require_screen_share: Boolean(row.data.require_screen_share), track_tab_switches: row.data.track_tab_switches !== false,
      track_disconnects: row.data.track_disconnects !== false, track_audio_activity: Boolean(row.data.track_audio_activity),
      track_face_presence: Boolean(row.data.track_face_presence), proctoring_consent_text: row.data.proctoring_consent_text,
      created_at: row.created_at, questions: row.data.questions || [], maximus_job_offers: offers.find(offer => offer.id === row.data.offer_id),
      assignments: [],
    }));
    return NextResponse.json({ items: tests, offers });
  }
  const [{ data, error }, { data: offers }] = await Promise.all([
    ctx.supabase.from('maximus_written_tests')
      .select('*,maximus_job_offers(id,reference,title,status),maximus_test_questions(*),maximus_test_assignments(id,status,automatic_score,final_score,submitted_at,maximus_staff_applications(id,full_name,email),maximus_test_reviews(id,reviewer_email,status,score,comments,submitted_at))')
      .order('created_at', { ascending: false }),
    ctx.supabase.from('maximus_job_offers').select('id,reference,title,status').in('status', ['draft','submitted','endorsed','validated','published','closed']).order('created_at', { ascending: false }),
  ]);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const items = (data || []).map(test => ({
    ...test,
    questions: [...(test.maximus_test_questions || [])].sort((a, b) => a.position - b.position),
    assignments: test.maximus_test_assignments || [],
  }));
  return NextResponse.json({ items, offers: offers || [] });
}

export async function POST(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  let questions;
  try { questions = normalizedQuestions(body.questions); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Questions invalides.' }, { status: 400 }); }
  const title = String(body.title || '').trim();
  const offerId = String(body.offer_id || '');
  if (!title || !offerId || !questions.length) return NextResponse.json({ message: 'Offre, titre et au moins une question sont obligatoires.' }, { status: 400 });
  if ('local' in ctx && ctx.local) {
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), module: 'hr/recruitment/tests', title, reference: `T${crypto.randomUUID().replaceAll('-', '').slice(0, 7).toUpperCase()}`, status: 'draft', data: { offer_id: offerId, instructions: body.instructions, duration_minutes: Number(body.duration_minutes || 60), pass_score: Number(body.pass_score || 50), questions, ...proctoringConfig(body) }, created_at: now, updated_at: now };
    localMaximusRecords().push(row);
    return NextResponse.json({ item: row });
  }
  const { data: offer } = await ctx.supabase.from('maximus_job_offers').select('id').eq('id', offerId).maybeSingle();
  if (!offer) return NextResponse.json({ message: 'Offre introuvable.' }, { status: 404 });
  const { data, error } = await ctx.supabase.from('maximus_written_tests').insert({
    offer_id: offerId,
    title,
    instructions: String(body.instructions || '').trim() || null,
    duration_minutes: Number(body.duration_minutes || 60),
    pass_score: Number(body.pass_score || 50),
    created_by: ctx.user.id,
    ...proctoringConfig(body),
  }).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const { error: questionError } = await ctx.supabase.from('maximus_test_questions').insert(questions.map(question => ({ ...question, test_id: data.id })));
  if (questionError) {
    await ctx.supabase.from('maximus_written_tests').delete().eq('id', data.id);
    return NextResponse.json({ message: questionError.message }, { status: 400 });
  }
  await ctx.supabase.from('maximus_recruitment_events').insert({ process_type: 'staff', offer_id: offerId, event_type: 'test_created', to_status: 'draft', details: { test_id: data.id, question_count: questions.length }, actor_id: ctx.user.id, actor_email: ctx.user.email });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const body = await request.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ message: 'Epreuve requise.' }, { status: 400 });
  if ('local' in ctx && ctx.local) {
    const row = localMaximusRecords().find(item => item.id === id && item.module === 'hr/recruitment/tests');
    if (!row) return NextResponse.json({ message: 'Epreuve introuvable.' }, { status: 404 });
    if (body.action === 'transition') {
      const next = String(body.status) as TestStatus;
      if (!transitions[row.status as TestStatus]?.includes(next)) return NextResponse.json({ message: 'Transition interdite.' }, { status: 400 });
      row.status = next;
    } else {
      let questions;
      try { questions = normalizedQuestions(body.questions); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Questions invalides.' }, { status: 400 }); }
      row.title = body.title || row.title;
      row.data = { ...row.data, instructions: body.instructions, duration_minutes: body.duration_minutes, pass_score: body.pass_score, questions, ...proctoringConfig(body) };
    }
    row.updated_at = new Date().toISOString();
    localMaximusEvents().push({ id: crypto.randomUUID(), source_record_id: id, action: body.action || 'test_updated', details: { status: row.status }, created_at: row.updated_at });
    return NextResponse.json({ item: row });
  }
  const { data: existing } = await ctx.supabase.from('maximus_written_tests').select('*').eq('id', id).single();
  if (!existing) return NextResponse.json({ message: 'Epreuve introuvable.' }, { status: 404 });
  if (body.action === 'transition') {
    const next = String(body.status) as TestStatus;
    if (!transitions[existing.status as TestStatus]?.includes(next)) return NextResponse.json({ message: `Transition ${existing.status} vers ${next} interdite.` }, { status: 400 });
    const { data, error } = await ctx.supabase.from('maximus_written_tests').update({ status: next, validated_by: next === 'validated' ? ctx.user.id : existing.validated_by }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await ctx.supabase.from('maximus_recruitment_events').insert({ process_type: 'staff', offer_id: existing.offer_id, event_type: `test_${next}`, from_status: existing.status, to_status: next, details: { test_id: id, note: body.note || null }, actor_id: ctx.user.id, actor_email: ctx.user.email });
    return NextResponse.json({ item: data });
  }
  if (body.action === 'assign_reviewers') {
    const assignmentId = String(body.assignment_id || '');
    const emails = Array.isArray(body.reviewer_emails) ? [...new Set(body.reviewer_emails.map((email: unknown) => String(email).trim().toLowerCase()).filter(Boolean))] : [];
    if (!assignmentId || !emails.length) return NextResponse.json({ message: 'Copie et correcteurs requis.' }, { status: 400 });
    const { data: assignment } = await ctx.supabase.from('maximus_test_assignments').select('id,application_id,maximus_staff_applications(full_name),maximus_written_tests(title)').eq('id', assignmentId).single();
    if (!assignment) return NextResponse.json({ message: 'Copie introuvable.' }, { status: 404 });
    const { error } = await ctx.supabase.from('maximus_test_reviews').upsert(emails.map(email => ({ assignment_id: assignmentId, reviewer_email: email, status: 'invited' })), { onConflict: 'assignment_id,reviewer_email' });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await Promise.allSettled(emails.map(email => resend('/emails', { from: process.env.MAIL_FROM ?? 'NutVitaGlobalis <contact@nutvitaglobalis.com>', to: [email], subject: 'Invitation a corriger une epreuve Staff', text: `Bonjour,\n\nVous etes invite a corriger une epreuve du recrutement Staff NutVitaGlobalis.\nConnectez-vous a Maximus pour consulter la copie et soumettre votre evaluation.\n\nEquipe NutVitaGlobalis` })));
    return NextResponse.json({ ok: true });
  }
  if (body.action === 'submit_review') {
    const reviewId = String(body.review_id || '');
    const score = Number(body.score);
    if (!reviewId || score < 0 || score > 100) return NextResponse.json({ message: 'Correction ou note invalide.' }, { status: 400 });
    const { data: review, error } = await ctx.supabase.from('maximus_test_reviews').update({ score, comments: String(body.comments || ''), status: 'submitted', submitted_at: new Date().toISOString(), reviewer_id: ctx.user.id }).eq('id', reviewId).select('assignment_id').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    const { data: reviews } = await ctx.supabase.from('maximus_test_reviews').select('score').eq('assignment_id', review.assignment_id).eq('status', 'submitted');
    const scores = (reviews || []).map(item => Number(item.score)).filter(Number.isFinite);
    const finalScore = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
    if (finalScore !== null) {
      const { data: assignment } = await ctx.supabase.from('maximus_test_assignments').update({ final_score: finalScore, status: 'graded' }).eq('id', review.assignment_id).select('application_id').single();
      if (assignment) await ctx.supabase.from('maximus_staff_applications').update({ written_test_score: finalScore, status: 'test_graded' }).eq('id', assignment.application_id);
    }
    return NextResponse.json({ ok: true, final_score: finalScore });
  }
  if (!['draft', 'rejected'].includes(existing.status)) return NextResponse.json({ message: 'Cette epreuve n est plus modifiable.' }, { status: 400 });
  let questions;
  try { questions = normalizedQuestions(body.questions); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Questions invalides.' }, { status: 400 }); }
  if (!questions.length) return NextResponse.json({ message: 'Ajoutez au moins une question.' }, { status: 400 });
  const { error: updateError } = await ctx.supabase.from('maximus_written_tests').update({
    title: body.title,
    instructions: body.instructions || null,
    duration_minutes: Number(body.duration_minutes || 60),
    pass_score: Number(body.pass_score || 50),
    ...proctoringConfig(body),
  }).eq('id', id);
  if (updateError) return NextResponse.json({ message: updateError.message }, { status: 400 });
  await ctx.supabase.from('maximus_test_questions').delete().eq('test_id', id);
  const { error: questionError } = await ctx.supabase.from('maximus_test_questions').insert(questions.map(question => ({ ...question, test_id: id })));
  if (questionError) return NextResponse.json({ message: questionError.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const id = new URL(request.url).searchParams.get('id') || '';
  if ('local' in ctx && ctx.local) {
    const rows = localMaximusRecords();
    const index = rows.findIndex(row => row.id === id && row.module === 'hr/recruitment/tests');
    if (index < 0) return NextResponse.json({ message: 'Epreuve introuvable.' }, { status: 404 });
    if (!['draft', 'rejected'].includes(rows[index].status)) return NextResponse.json({ message: 'Suppression interdite.' }, { status: 400 });
    rows.splice(index, 1);
    return NextResponse.json({ ok: true });
  }
  const { data: test } = await ctx.supabase.from('maximus_written_tests').select('status').eq('id', id).single();
  if (!test || !['draft', 'rejected'].includes(test.status)) return NextResponse.json({ message: 'Seules les epreuves en brouillon ou rejetees peuvent etre supprimees.' }, { status: 400 });
  const { count } = await ctx.supabase.from('maximus_test_assignments').select('id', { count: 'exact', head: true }).eq('test_id', id);
  if (count) return NextResponse.json({ message: 'Cette epreuve est deja affectee et doit etre archivee.' }, { status: 400 });
  const { error } = await ctx.supabase.from('maximus_written_tests').delete().eq('id', id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
