import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ items: [] });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ items: [] }, { status: 401 });
  const { data, error } = await supabase
    .from("academy_notifications")
    .select("id,event_key,type,priority,title,title_en,message,message_en,href,read_at,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return Response.json({ items: [], error: error.message }, { status: 500 });
  return Response.json({ items: (data ?? []).map((item) => ({
    id: item.event_key || item.id,
    type: item.type,
    priority: item.priority,
    source: "manual",
    title: item.title,
    titleEn: item.title_en ?? undefined,
    message: item.message,
    messageEn: item.message_en ?? undefined,
    href: item.href ?? undefined,
    createdAt: item.created_at,
    readAt: item.read_at ?? undefined,
  })) });
}
