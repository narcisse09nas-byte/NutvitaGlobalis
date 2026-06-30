import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';
import { createAdminClient } from '@/lib/supabase/admin';

async function candidate() {
  if (!hasSupabaseConfig()) return { error: NextResponse.json({ message: 'Supabase non configure.' }, { status: 503 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.account_type !== 'staff_candidate') return { error: NextResponse.json({ message: 'Compte candidat Staff requis.' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const ctx = await candidate();
  if ('error' in ctx) return ctx.error;
  const { data, error } = await createAdminClient().from('maximus_test_assignments')
    .select('id,status,sent_at,available_from,expires_at,started_at,submitted_at,automatic_score,final_score,answers,proctor_room,proctoring_consent_at,camera_started_at,screen_started_at,maximus_written_tests(id,title,instructions,duration_minutes,pass_score,proctoring_mode,require_camera,require_screen_share,track_tab_switches,track_disconnects,track_audio_activity,track_face_presence,proctoring_consent_text,maximus_test_questions(id,question_type,prompt,help_text,options,required,points,max_words,allowed_mime_types,max_file_size_mb,position)),maximus_staff_applications!inner(id,candidate_id,maximus_job_offers(title,reference))')
    .eq('maximus_staff_applications.candidate_id', ctx.user.id)
    .order('sent_at', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const items = (data || []).map(item => {
    const relation = item.maximus_written_tests as unknown;
    const test = (Array.isArray(relation) ? relation[0] : relation) as {
      maximus_test_questions?: Array<{ position: number }>;
      [key: string]: unknown;
    } | null;
    return {
      ...item,
      maximus_written_tests: test ? {
        ...test,
        maximus_test_questions: [...(test.maximus_test_questions || [])].sort((a, b) => a.position - b.position),
      } : null,
    };
  });
  return NextResponse.json({ items });
}

export async function PATCH(request: Request) {
  const ctx = await candidate();
  if ('error' in ctx) return ctx.error;
  const service = createAdminClient();
  const body = await request.json();
  const id = String(body.id || '');
  const action = String(body.action || '');
  const { data: assignment } = await service.from('maximus_test_assignments')
    .select('*,maximus_written_tests(id,duration_minutes,proctoring_mode,require_camera,require_screen_share,maximus_test_questions(id,question_type,correct_answers,points,required)),maximus_staff_applications!inner(id,candidate_id)')
    .eq('id', id)
    .eq('maximus_staff_applications.candidate_id', ctx.user.id)
    .single();
  if (!assignment) return NextResponse.json({ message: 'Epreuve introuvable.' }, { status: 404 });
  if (assignment.expires_at && new Date(assignment.expires_at) < new Date() && assignment.status !== 'submitted') {
    await service.from('maximus_test_assignments').update({ status: 'expired' }).eq('id', id);
    return NextResponse.json({ message: 'Le delai de cette epreuve est expire.' }, { status: 400 });
  }
  const testRelation = assignment.maximus_written_tests as unknown;
  const writtenTest = (Array.isArray(testRelation) ? testRelation[0] : testRelation) as {
    duration_minutes?: number;
    proctoring_mode?: string;
    require_camera?: boolean;
    require_screen_share?: boolean;
    maximus_test_questions?: Array<{
      id: string;
      question_type: string;
      correct_answers?: unknown[];
      points?: number;
      required?: boolean;
    }>;
  } | null;
  if (!writtenTest) return NextResponse.json({ message: 'Definition de l epreuve introuvable.' }, { status: 404 });
  if (action === 'start') {
    if (!['sent', 'opened'].includes(assignment.status)) return NextResponse.json({ message: 'Cette epreuve ne peut pas etre demarree.' }, { status: 400 });
    if (writtenTest.proctoring_mode !== 'none' && body.proctoring_consent !== true) {
      return NextResponse.json({ message: 'Votre consentement explicite a la surveillance est requis avant le demarrage.' }, { status: 400 });
    }
    if (writtenTest.require_camera && body.camera_ready !== true) return NextResponse.json({ message: 'La camera doit etre activee avant le demarrage.' }, { status: 400 });
    if (writtenTest.require_screen_share && body.screen_ready !== true) return NextResponse.json({ message: 'Le partage d ecran doit etre actif avant le demarrage.' }, { status: 400 });
    const startedAt = new Date();
    const durationExpiry = new Date(startedAt.getTime() + Number(writtenTest.duration_minutes || 60) * 60000);
    const expiresAt = assignment.expires_at && new Date(assignment.expires_at) < durationExpiry ? assignment.expires_at : durationExpiry.toISOString();
    const room = assignment.proctor_room || (writtenTest.proctoring_mode === 'live' ? `NVG-PROCTOR-${id.replaceAll('-', '').slice(0, 18).toUpperCase()}` : null);
    const { data, error } = await service.from('maximus_test_assignments').update({
      status: 'in_progress',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt,
      proctor_room: room,
      proctoring_consent_at: writtenTest.proctoring_mode !== 'none' ? startedAt.toISOString() : assignment.proctoring_consent_at,
      camera_started_at: body.camera_ready === true ? startedAt.toISOString() : assignment.camera_started_at,
      screen_started_at: body.screen_ready === true ? startedAt.toISOString() : assignment.screen_started_at,
      last_heartbeat_at: startedAt.toISOString(),
    }).eq('id', id).select('*').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await service.from('maximus_staff_applications').update({ status: 'test_in_progress' }).eq('id', assignment.application_id);
    return NextResponse.json({ item: data });
  }
  if (action !== 'submit' || assignment.status !== 'in_progress') return NextResponse.json({ message: 'Soumission invalide.' }, { status: 400 });
  const answers = body.answers && typeof body.answers === 'object' ? body.answers as Record<string, unknown> : {};
  const questions = writtenTest.maximus_test_questions || [];
  for (const question of questions) {
    if (question.required && (answers[question.id] === undefined || answers[question.id] === '' || (Array.isArray(answers[question.id]) && !(answers[question.id] as unknown[]).length))) {
      return NextResponse.json({ message: 'Toutes les questions obligatoires doivent recevoir une reponse.' }, { status: 400 });
    }
  }
  let earned = 0;
  let automaticMaximum = 0;
  for (const question of questions) {
    if (!['single_choice', 'multiple_choice'].includes(question.question_type)) continue;
    const points = Number(question.points || 0);
    automaticMaximum += points;
    const expected = (Array.isArray(question.correct_answers) ? question.correct_answers : []).map(String).sort();
    const answer = answers[question.id];
    const received = (Array.isArray(answer) ? answer : [answer]).map(String).sort();
    if (expected.length === received.length && expected.every((value, index) => value === received[index])) earned += points;
  }
  const automaticScore = automaticMaximum > 0 ? Math.round(earned / automaticMaximum * 10000) / 100 : 0;
  const { data, error } = await service.from('maximus_test_assignments').update({
    status: 'submitted',
    answers,
    automatic_score: automaticScore,
    submitted_at: new Date().toISOString(),
  }).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await service.from('maximus_staff_applications').update({ status: 'test_submitted' }).eq('id', assignment.application_id);
  await service.from('maximus_recruitment_events').insert({ process_type: 'staff', staff_application_id: assignment.application_id, event_type: 'test_submitted', from_status: 'test_in_progress', to_status: 'test_submitted', details: { assignment_id: id, automatic_score: automaticScore }, actor_id: ctx.user.id, actor_email: ctx.user.email });
  if (writtenTest.proctoring_mode !== 'none') await ctx.supabase.from('maximus_proctoring_events').insert({ assignment_id: id, event_type: 'test_submitted', details: { automatic_score: automaticScore }, client_recorded_at: new Date().toISOString() });
  return NextResponse.json({ item: data });
}
