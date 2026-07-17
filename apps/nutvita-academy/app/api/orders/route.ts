import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { data, error } = await supabase.from("orders").select("id, status, currency, subtotal, discount, total, transaction_reference, paid_at, created_at, order_items(course_id, course_title, unit_price, discount, final_price)").order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ orders: data ?? [] });
}
