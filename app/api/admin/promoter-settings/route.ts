import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
export async function PATCH(request: Request) {
  const { supabase, user } = await requireAdmin();
  const body = await request.json(); const commissionRate = Number(body.commission_rate);
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) return NextResponse.json({ message: "Taux invalide." }, { status: 400 });
  const { data, error } = await supabase.from("promoter_program_settings").upsert({ id: 1, commission_rate: commissionRate, updated_at: new Date().toISOString(), updated_by: user.id }).select().single();
  return error ? NextResponse.json({ message: error.message }, { status: 400 }) : NextResponse.json({ item: data });
}