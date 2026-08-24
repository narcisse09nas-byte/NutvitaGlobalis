import { redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import PasswordChange from "@/components/client/PasswordChange";
import { createClient } from "@/lib/supabase/server";

// Refinement program, Wave 9 (item 50): a site-wide "change my password" entry point, reachable
// from the PPM shell — reuses the existing /api/client/change-password route and PasswordChange
// component, both already account-type-agnostic (they operate on the authenticated session, not
// a specific profile table), and the forgot-password flow at /mot-de-passe-oublie.
export default async function PPMMonComptePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=%2Fop-management%2Fmon-compte");
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/mon-compte", label: "Mon compte" }]}>
    <div className="grid max-w-xl gap-5">
      <div>
        <h1 className="text-2xl font-black text-forest">Mon compte</h1>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
      </div>
      <PasswordChange />
    </div>
  </PPMShell>;
}
