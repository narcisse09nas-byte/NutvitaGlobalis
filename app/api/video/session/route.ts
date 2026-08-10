import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createJaasSession, hasJaasConfig } from "@/lib/jaas";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store, private, max-age=0" };

function safeRoom(value: unknown) {
  const room = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{6,120}$/.test(room) ? room : "";
}

export async function POST(request: Request) {
  try {
    if (!hasJaasConfig()) {
      return NextResponse.json({ message: "Le service video securise n'est pas configure." }, { status: 503, headers: noStore });
    }
    const body = await request.json();
    const room = safeRoom(body.room_name);
    if (!room) return NextResponse.json({ message: "Salle video invalide." }, { status: 400, headers: noStore });

    const admin = createAdminClient();
    const externalToken = String(body.external_access_token || "").trim();
    if (externalToken) {
      const { data: participant } = await admin.from("maximus_meeting_participants")
        .select("id,email,full_name,participant_role,invitation_status,maximus_meetings!inner(room_name,status)")
        .eq("access_token", externalToken).maybeSingle();
      const meeting = participant?.maximus_meetings as unknown as { room_name?: string; status?: string } | null;
      if (!participant || meeting?.room_name !== room || !["sent", "accepted"].includes(participant.invitation_status) || meeting.status === "cancelled") {
        return NextResponse.json({ message: "Invitation video invalide ou revoquee." }, { status: 403, headers: noStore });
      }
      const session = createJaasSession(room, {
        id: `external-${participant.id}`,
        name: participant.full_name,
        email: participant.email,
        moderator: participant.participant_role === "organizer",
      });
      return NextResponse.json({ ...session, displayName: participant.full_name }, { headers: noStore });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Authentification requise." }, { status: 401, headers: noStore });

    const [{ data: adminUser }, { data: maximusAccess }] = await Promise.all([
      admin.from("admin_users").select("id,role,active").eq("id", user.id).eq("active", true).maybeSingle(),
      admin.from("maximus_user_access").select("active,unit,units,module_access,is_assistant_admin,functions").eq("user_id", user.id).eq("active", true).maybeSingle(),
    ]);
    const isAdmin = Boolean(adminUser);
    let allowed = false;
    let moderator = isAdmin;

    const { data: call } = await admin.from("collaboration_calls").select("id,created_by,status").eq("room_name", room).maybeSingle();
    if (call && call.status !== "cancelled") {
      const { data: member } = await admin.from("collaboration_call_members").select("user_id").eq("call_id", call.id).eq("user_id", user.id).maybeSingle();
      allowed = isAdmin || call.created_by === user.id || Boolean(member);
      moderator = isAdmin || call.created_by === user.id;
    }

    if (!allowed) {
      const { data: interview } = await admin.from("video_interviews").select("candidate_id,created_by,status").eq("room_name", room).maybeSingle();
      if (interview && interview.status !== "cancelled") {
        allowed = isAdmin || interview.candidate_id === user.id || interview.created_by === user.id;
        moderator = isAdmin || interview.created_by === user.id;
      }
    }

    if (!allowed) {
      const { data: meeting } = await admin.from("maximus_meetings").select("id,created_by,status").eq("room_name", room).maybeSingle();
      if (meeting && meeting.status !== "cancelled") {
        const { data: participant } = await admin.from("maximus_meeting_participants").select("participant_role,invitation_status").eq("meeting_id", meeting.id).eq("user_id", user.id).maybeSingle();
        allowed = isAdmin || meeting.created_by === user.id || Boolean(participant && participant.invitation_status !== "revoked");
        moderator = isAdmin || meeting.created_by === user.id || participant?.participant_role === "organizer";
      }
    }

    if (!allowed) {
      const { data: assignment } = await admin.from("maximus_test_assignments")
        .select("id,status,maximus_staff_applications!inner(candidate_id)").eq("proctor_room", room).maybeSingle();
      const application = assignment?.maximus_staff_applications as unknown as { candidate_id?: string } | null;
      const proctorAccess = Boolean(maximusAccess && (
        maximusAccess.is_assistant_admin || maximusAccess.unit === "hr" || maximusAccess.units?.includes("hr") ||
        maximusAccess.module_access?.some((entry: string) => entry.includes("recruitment") || entry.includes("proctor"))
      ));
      if (assignment && !["expired", "cancelled"].includes(assignment.status)) {
        allowed = isAdmin || proctorAccess || application?.candidate_id === user.id;
        moderator = isAdmin || proctorAccess;
      }
    }

    if (!allowed) return NextResponse.json({ message: "Vous n'etes pas autorise a rejoindre cette salle." }, { status: 403, headers: noStore });

    const displayName = String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Participant NutVitaGlobalis");
    const session = createJaasSession(room, { id: user.id, name: displayName, email: user.email, avatar: user.user_metadata?.avatar_url, moderator });
    return NextResponse.json({ ...session, displayName }, { headers: noStore });
  } catch (error) {
    console.error("Secure video session error", error);
    return NextResponse.json({ message: "Impossible d'ouvrir la salle video securisee." }, { status: 500, headers: noStore });
  }
}
