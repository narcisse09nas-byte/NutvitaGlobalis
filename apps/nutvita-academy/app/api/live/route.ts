import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const [sessions, registrations, attendance, messages] = await Promise.all([
    supabase.from("academy_live_sessions").select("*").order("starts_at", { ascending: true }),
    supabase.from("academy_live_registrations").select("*").order("registered_at", { ascending: false }),
    supabase.from("academy_live_attendance").select("*").order("joined_at", { ascending: false }),
    supabase.from("academy_live_messages").select("*").order("created_at", { ascending: true }),
  ]);
  const error = sessions.error ?? registrations.error ?? attendance.error ?? messages.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    version: 1,
    sessions: (sessions.data ?? []).map((item) => ({ id: item.id, organizationId: item.organization_id ?? undefined, courseSlug: item.course_id ?? undefined, title: item.title, description: item.description, provider: item.provider, roomName: item.room_name, externalUrl: item.external_url ?? undefined, instructorUserId: item.instructor_user_id, instructorName: item.instructor_name, startAt: item.starts_at, endAt: item.ends_at, timezone: item.timezone, capacity: item.capacity, status: item.status, createdAt: item.created_at, updatedAt: item.updated_at })),
    registrations: (registrations.data ?? []).map((item) => ({ id: item.id, sessionId: item.session_id, userId: item.user_id, fullName: item.full_name, email: item.email, registeredAt: item.registered_at })),
    attendance: (attendance.data ?? []).map((item) => ({ id: item.id, sessionId: item.session_id, userId: item.user_id, fullName: item.full_name, joinedAt: item.joined_at, leftAt: item.left_at ?? undefined, durationSeconds: item.left_at ? Math.max(0, Math.round((new Date(item.left_at).getTime() - new Date(item.joined_at).getTime()) / 1000)) : 0 })),
    messages: (messages.data ?? []).map((item) => ({ id: item.id, sessionId: item.session_id, userId: item.user_id, authorName: item.author_name, content: item.content, createdAt: item.created_at })),
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", auth.user.id).single();
  if (!profile || !["instructor", "admin", "super_admin"].includes(profile.role)) return Response.json({ error: apiText(request, "Rôle formateur ou administrateur requis.", "Instructor or administrator role required.") }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const startsAt = new Date(String(body?.startAt ?? ""));
  const endsAt = new Date(String(body?.endAt ?? ""));
  const capacity = Number(body?.capacity);
  if (!body || !String(body.title ?? "").trim() || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt || !Number.isInteger(capacity) || capacity < 1 || capacity > 500) return Response.json({ error: apiText(request, "Données de session invalides.", "Invalid session data.") }, { status: 400 });
  const roomName = String(body.roomName ?? `nvga-${crypto.randomUUID()}`).trim().replace(/[^a-zA-Z0-9_-]/g, "-");
  const { data, error } = await supabase.from("academy_live_sessions").insert({ title: String(body.title).trim(), description: String(body.description ?? "").trim(), provider: String(body.provider ?? "jitsi"), room_name: roomName, external_url: body.externalUrl ? String(body.externalUrl) : null, instructor_user_id: auth.user.id, instructor_name: profile.full_name, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), timezone: String(body.timezone ?? "Africa/Lagos"), capacity, status: "scheduled" }).select("id").single();
  if (error || !data) return Response.json({ error: error?.message ?? apiText(request, "Création impossible.", "Unable to create session.") }, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
