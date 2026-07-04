import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin.from("maximus_meeting_participants")
    .select("id,full_name,email,participant_role,invitation_status,maximus_meetings(id,reference,title,provider,room_name,meeting_url,location,scheduled_at,duration_minutes,agenda,status)")
    .eq("access_token", token).eq("participant_type", "external").maybeSingle();
  if (error || !data || data.invitation_status === "revoked") return NextResponse.json({ message: "Invitation invalide ou revoquee." }, { status: 404 });
  return NextResponse.json({ invitation: data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const status = body.action === "decline" ? "declined" : "accepted";
  const { data, error } = await admin.from("maximus_meeting_participants").update({
    invitation_status: status,
    joined_at: status === "accepted" ? new Date().toISOString() : null,
  }).eq("access_token", token).eq("participant_type", "external").neq("invitation_status", "revoked").select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Invitation invalide." }, { status: 404 });
  return NextResponse.json({ ok: true, status });
}
