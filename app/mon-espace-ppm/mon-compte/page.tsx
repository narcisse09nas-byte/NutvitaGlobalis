import { requirePpmStaff } from "@/lib/ppm/require-ppm-staff";
import PpmStaffShell from "@/components/ppm-staff/PpmStaffShell";
import PasswordChange from "@/components/client/PasswordChange";

export const metadata = { title: "Mon compte | Mon espace PPM" };

export default async function PpmStaffMonComptePage() {
  const { user } = await requirePpmStaff();

  return <PpmStaffShell name={user.user_metadata?.full_name || user.email || "Utilisateur"}>
    <div className="grid max-w-xl gap-5">
      <div><h1 className="text-2xl font-black text-forest">Mon compte</h1><p className="mt-1 text-sm text-slate-500">{user.email}</p></div>
      <PasswordChange />
    </div>
  </PpmStaffShell>;
}
