import AdminShell from "@/components/admin/AdminShell";
import WaitingRoomManager from "@/components/admin/WaitingRoomManager";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const [{ data: requests }, { data: partners }] = await Promise.all([
    supabase.from("consultation_waiting_room").select("*, client_profiles(full_name,email,phone,city,country)").order("created_at", { ascending: false }),
    supabase.from("dietitian_profiles").select("*").order("full_name"),
  ]);
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Salle d'attente consultations</h1><p className="mt-2 text-slate-500">Attribuez les nouveaux clients aux partenaires. Le score IA est une aide rapide, a valider par l'admin.</p></div><WaitingRoomManager initial={requests || []} partners={partners || []} /></AdminShell>;
}
