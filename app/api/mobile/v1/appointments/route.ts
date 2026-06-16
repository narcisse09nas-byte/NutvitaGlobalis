import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const { data, error } = await supabase.from("appointments").select("*").eq("client_id", user.id).order("scheduled_at", { ascending: true });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const body = await request.json();
  const payload = {
    client_id: user.id,
    dietitian_id: body.dietitian_id || null,
    appointment_type: body.appointment_type || "teleconsultation",
    scheduled_at: body.scheduled_at,
    timezone: body.timezone || "Africa/Douala",
    status: "pending",
    reason: body.reason || null,
  };
  const { data, error } = await supabase.from("appointments").insert(payload).select("*").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data }, { status: 201 });
}
