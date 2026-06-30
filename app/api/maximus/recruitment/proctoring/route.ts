import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseConfig } from '@/lib/supabase/config';

const allowedEvents = new Set([
  'consent_granted', 'session_started', 'heartbeat', 'online', 'offline',
  'tab_hidden', 'tab_visible', 'window_blur', 'window_focus',
  'camera_started', 'camera_stopped', 'camera_error',
  'screen_started', 'screen_stopped', 'screen_error',
  'audio_activity', 'speech_detected', 'face_absent', 'face_present',
  'conference_joined', 'conference_left', 'test_submitted',
]);

async function userContext() {
  if (!hasSupabaseConfig()) return { error: NextResponse.json({ message: 'Supabase non configure.' }, { status: 503 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: 'Authentification requise.' }, { status: 401 }) };
  return { supabase, user };
}

export async function GET() {
  const ctx = await userContext();
  if ('error' in ctx) return ctx.error;
  const { data: admin } = await ctx.supabase.from('admin_users').select('role,active').eq('id', ctx.user.id).maybeSingle();
  if (!admin?.active || admin.role !== 'super_admin') return NextResponse.json({ message: 'Acces surveillant requis.' }, { status: 403 });
  const { data, error } = await ctx.supabase.from('maximus_test_assignments')
    .select('id,status,proctor_room,proctoring_consent_at,camera_started_at,screen_started_at,last_heartbeat_at,proctoring_summary,started_at,expires_at,submitted_at,maximus_written_tests(id,title,proctoring_mode,require_camera,require_screen_share,track_tab_switches,track_disconnects,track_audio_activity,track_face_presence),maximus_staff_applications(id,full_name,email,maximus_job_offers(title,reference)),maximus_proctoring_events(id,event_type,severity,details,client_recorded_at,created_at)')
    .neq('maximus_written_tests.proctoring_mode', 'none')
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const items = (data || []).map(raw => {
    const events = raw.maximus_proctoring_events || [];
    const counts = events.reduce<Record<string, number>>((result, event) => {
      result[event.event_type] = (result[event.event_type] || 0) + 1;
      return result;
    }, {});
    return { ...raw, event_counts: counts, recent_events: events.slice(-25) };
  });
  return NextResponse.json({ items, jitsi_domain: process.env.NEXT_PUBLIC_JITSI_DOMAIN || 'meet.jit.si' });
}

export async function POST(request: Request) {
  const ctx = await userContext();
  if ('error' in ctx) return ctx.error;
  if (ctx.user.user_metadata?.account_type !== 'staff_candidate') return NextResponse.json({ message: 'Compte candidat Staff requis.' }, { status: 403 });
  const body = await request.json();
  const assignmentId = String(body.assignment_id || '');
  const rawEvents: Array<Record<string, unknown>> = Array.isArray(body.events) ? body.events : [body];
  const { data: assignment } = await ctx.supabase.from('maximus_test_assignments')
    .select('id,status,application_id,maximus_staff_applications!inner(candidate_id)')
    .eq('id', assignmentId)
    .eq('maximus_staff_applications.candidate_id', ctx.user.id)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ message: 'Session de surveillance introuvable.' }, { status: 404 });
  const events = rawEvents.slice(0, 100).map((raw: Record<string, unknown>) => ({
    assignment_id: assignmentId,
    event_type: String(raw.event_type || ''),
    severity: ['info', 'warning', 'critical'].includes(String(raw.severity)) ? String(raw.severity) : 'info',
    details: raw.details && typeof raw.details === 'object' ? raw.details : {},
    client_recorded_at: raw.client_recorded_at || new Date().toISOString(),
  })).filter(event => allowedEvents.has(event.event_type));
  if (!events.length) return NextResponse.json({ message: 'Aucun evenement valide.' }, { status: 400 });
  const { error } = await ctx.supabase.from('maximus_proctoring_events').insert(events);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const update: Record<string, unknown> = { last_heartbeat_at: new Date().toISOString() };
  if (events.some(event => event.event_type === 'consent_granted')) update.proctoring_consent_at = new Date().toISOString();
  if (events.some(event => event.event_type === 'camera_started')) update.camera_started_at = new Date().toISOString();
  if (events.some(event => event.event_type === 'screen_started')) update.screen_started_at = new Date().toISOString();
  await ctx.supabase.from('maximus_test_assignments').update(update).eq('id', assignmentId);
  return NextResponse.json({ ok: true });
}
