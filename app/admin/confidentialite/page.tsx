import AdminShell from "@/components/admin/AdminShell";
import PrivacyRequestsManager from "@/components/admin/PrivacyRequestsManager";
import { requireAdmin } from "@/lib/admin";

export default async function PrivacyRequestsAdminPage() {
  const { supabase, admin } = await requireAdmin();
  const [{ data: requests }, { data: clients }] = await Promise.all([
    supabase.from("privacy_requests").select("*").order("requested_at", { ascending: false }),
    supabase.from("client_profiles").select("id,full_name,email"),
  ]);
  return <AdminShell name={admin.full_name || admin.email}>
    <div className="mb-7">
      <h1 className="text-3xl font-black">Demandes RGPD</h1>
      <p className="mt-2 text-slate-500">Demandes d&apos;export, de rectification ou de suppression soumises depuis l&apos;espace client.</p>
    </div>
    <PrivacyRequestsManager requests={requests || []} clients={clients || []} />
  </AdminShell>;
}
