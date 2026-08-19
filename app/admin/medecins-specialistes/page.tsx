import AdminShell from "@/components/admin/AdminShell";
import MedicalSpecialistAdmin from "@/components/admin/MedicalSpecialistAdmin";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { supabase, admin } = await requireAdmin();
  const [applications, interviews, settings, page] = await Promise.all([
    supabase.from("medical_specialist_applications").select("*").order("applied_at", { ascending: false }),
    supabase
      .from("medical_specialist_interviews")
      .select("*,medical_specialist_applications(full_name,application_code)")
      .order("scheduled_at", { ascending: false }),
    supabase.from("medical_specialist_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("medical_specialist_page_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  return (
    <AdminShell name={admin.full_name || admin.email}>
      <div className="mb-7">
        <p className="font-black uppercase tracking-widest text-orange">Réseau médical</p>
        <h1 className="text-4xl font-black">Recrutement et management des médecins spécialistes</h1>
        <p className="mt-2 text-slate-500">
          Les comptes de paiement, transactions et règlements partenaires sont centralisés dans Maximus.
        </p>
      </div>
      <MedicalSpecialistAdmin
        applications={applications.data || []}
        interviews={interviews.data || []}
        specialists={[]}
        accounts={[]}
        payments={[]}
        settings={{ ...(settings.data || {}), page: page.data }}
      />
    </AdminShell>
  );
}
