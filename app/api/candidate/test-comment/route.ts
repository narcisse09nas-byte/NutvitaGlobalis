import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connectez-vous pour continuer." }, { status: 401 });
  const body = await request.json();
  const track = String(body.track || "");
  const testRefId = String(body.test_ref_id || "");
  const message = String(body.message || "").trim();
  if (!["recruitment", "staff"].includes(track) || !testRefId || !message) {
    return NextResponse.json({ message: "Message invalide." }, { status: 400 });
  }
  const { data, error } = await supabase.from("test_candidate_comments").insert({
    candidate_id: user.id, track, test_ref_id: testRefId, message,
  }).select("id,message,created_at").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ item: data });
}
