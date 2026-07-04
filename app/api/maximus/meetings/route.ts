import { NextResponse } from "next/server";
import { requireMaximusApi } from "@/lib/maximus-api-auth";
import { resend } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const moduleName = "communications/meetings";
const siteUrl = (request: Request) => (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");

function reference() {
  return `MTG-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  const [{ data: currentAccess }, { data: currentAdmin }] = await Promise.all([
    supabase.from("maximus_user_access").select("*").eq("user_id", user.id).eq("active", true).maybeSingle(),
    supabase.from("admin_users").select("role,active").eq("id", user.id).eq("active", true).maybeSingle(),
  ]);
  if (!currentAccess && !currentAdmin) return NextResponse.json({ message: "Compte Maximus requis." }, { status: 403 });
  const units = currentAccess?.units || [currentAccess?.unit].filter(Boolean);
  const canCreate = currentAdmin?.role === "super_admin"
    || currentAccess?.is_assistant_admin
    || (units.includes("communications") && currentAccess?.functions?.includes("creator"))
    || currentAccess?.module_access?.includes(moduleName) && currentAccess?.functions?.includes("creator");
  const [{ data: meetings, error }, { data: accessUsers }, { data: admins }] = await Promise.all([
    supabase.from("maximus_meetings").select("*,maximus_meeting_participants(*)").order("scheduled_at", { ascending: false }),
    supabase.from("maximus_user_access").select("user_id,email,full_name,role,units,active").eq("active", true).order("full_name"),
    supabase.from("admin_users").select("id,email,full_name,role,active").eq("active", true).order("full_name"),
  ]);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  const users = new Map<string, Record<string, unknown>>();
  for (const item of accessUsers || []) users.set(item.user_id, { id: item.user_id, email: item.email, full_name: item.full_name, role: item.role, units: item.units || [] });
  for (const item of admins || []) users.set(item.id, { id: item.id, email: item.email, full_name: item.full_name || item.email, role: item.role, units: ["administration"] });
  return NextResponse.json({ meetings: meetings || [], users: [...users.values()], current_user_id: user.id, can_create: Boolean(canCreate), jitsi_domain: process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si" });
}

export async function POST(request: Request) {
  const ctx = await requireMaximusApi(moduleName, "creator");
  if ("error" in ctx) return ctx.error;
  const body = await request.json();
  const title = String(body.title || "").trim();
  const scheduledAt = new Date(String(body.scheduled_at || ""));
  const provider = ["jitsi", "external", "physical"].includes(String(body.provider)) ? String(body.provider) : "jitsi";
  if (!title || Number.isNaN(+scheduledAt)) return NextResponse.json({ message: "Titre, date et heure sont requis." }, { status: 400 });
  const roomName = provider === "jitsi" ? `MAXIMUS-${crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase()}` : null;
  const meetingUrl = provider === "jitsi"
    ? `https://${process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si"}/${roomName}`
    : provider === "external" ? String(body.meeting_url || "").trim() : null;
  if (provider === "external" && !String(meetingUrl || "").startsWith("https://")) return NextResponse.json({ message: "Un lien HTTPS est requis." }, { status: 400 });
  if (provider === "physical" && !String(body.location || "").trim()) return NextResponse.json({ message: "Le lieu de la rencontre est requis." }, { status: 400 });

  const { data: meeting, error } = await ctx.supabase.from("maximus_meetings").insert({
    reference: reference(),
    title,
    meeting_type: body.meeting_type || "team",
    provider,
    room_name: roomName,
    meeting_url: meetingUrl,
    location: provider === "physical" ? String(body.location || "").trim() : null,
    scheduled_at: scheduledAt.toISOString(),
    duration_minutes: Math.max(5, Math.min(480, Number(body.duration_minutes || 45))),
    agenda: String(body.agenda || "").trim() || null,
    status: "scheduled",
    created_by: ctx.user.id,
  }).select("*").single();
  if (error || !meeting) return NextResponse.json({ message: error?.message || "Creation impossible." }, { status: 400 });

  const internalIds = [...new Set((Array.isArray(body.internal_user_ids) ? body.internal_user_ids : []).map(String).filter(Boolean))];
  if (!internalIds.includes(ctx.user.id)) internalIds.push(ctx.user.id);
  const [{ data: internalAccess }, { data: internalAdmins }] = await Promise.all([
    ctx.supabase.from("maximus_user_access").select("user_id,email,full_name").in("user_id", internalIds),
    ctx.supabase.from("admin_users").select("id,email,full_name").in("id", internalIds),
  ]);
  const identities = new Map<string, { id: string; email: string; full_name: string }>();
  for (const item of internalAccess || []) identities.set(item.user_id, { id: item.user_id, email: item.email, full_name: item.full_name });
  for (const item of internalAdmins || []) identities.set(item.id, { id: item.id, email: item.email, full_name: item.full_name || item.email });
  const reservedEmails = new Set([...identities.values()].map(item => item.email.trim().toLowerCase()));
  const external = (Array.isArray(body.external_participants) ? body.external_participants : [])
    .filter((item: any) => item?.email && item?.full_name)
    .map((item: any) => ({
      email: String(item.email).trim().toLowerCase(),
      full_name: String(item.full_name).trim(),
      role: item.role || "participant",
    }))
    .filter((item: { email: string }) => {
      if (reservedEmails.has(item.email)) return false;
      reservedEmails.add(item.email);
      return true;
    });
  const participantRows = [
    ...[...identities.values()].map(item => ({ meeting_id: meeting.id, participant_type: "staff", user_id: item.id, email: item.email.toLowerCase(), full_name: item.full_name, participant_role: item.id === ctx.user.id ? "organizer" : "participant", invitation_status: "sent", invited_at: new Date().toISOString() })),
    ...external.map((item: { email: string; full_name: string; role: string }) => ({ meeting_id: meeting.id, participant_type: "external", user_id: null, email: item.email, full_name: item.full_name, participant_role: item.role, invitation_status: "sent", invited_at: new Date().toISOString() })),
  ];
  const { data: participants, error: participantError } = await ctx.supabase.from("maximus_meeting_participants").insert(participantRows).select("*");
  if (participantError) {
    await ctx.supabase.from("maximus_meetings").delete().eq("id", meeting.id);
    return NextResponse.json({ message: participantError.message }, { status: 400 });
  }

  const root = siteUrl(request);
  await Promise.allSettled((participants || []).map(async participant => {
    const accessUrl = participant.participant_type === "external"
      ? `${root}/maximus-reunion/${participant.access_token}`
      : `${root}/maximus/communications/meetings?meeting=${meeting.id}`;
    await resend("/emails", {
      from: process.env.MAIL_FROM || "Maximus <contact@nutvitaglobalis.com>",
      to: [participant.email],
      subject: `Invitation Maximus - ${meeting.title}`,
      text: `Bonjour ${participant.full_name},\n\nVous etes invite(e) a la reunion Maximus « ${meeting.title} » le ${scheduledAt.toLocaleString("fr-FR")}.\n\n${meeting.agenda ? `Ordre du jour: ${meeting.agenda}\n\n` : ""}Acces: ${accessUrl}\n\nCe lien est personnel.`,
    });
  }));
  return NextResponse.json({ meeting: { ...meeting, maximus_meeting_participants: participants || [] } });
}

export async function PATCH(request: Request) {
  const ctx = await requireMaximusApi(moduleName, "editor");
  if ("error" in ctx) return ctx.error;
  const body = await request.json();
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ message: "Reunion requise." }, { status: 400 });
  const allowed = ["scheduled", "in_progress", "completed", "cancelled"];
  const payload: Record<string, unknown> = {};
  if (allowed.includes(body.status)) payload.status = body.status;
  if (body.minutes !== undefined) payload.minutes = String(body.minutes || "");
  if (Array.isArray(body.decisions)) payload.decisions = body.decisions;
  const { data, error } = await ctx.supabase.from("maximus_meetings").update(payload).eq("id", id).select("*,maximus_meeting_participants(*)").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ meeting: data });
}
