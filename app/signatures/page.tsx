import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignatureCenter from "@/components/signatures/SignatureCenter";

export default async function SignaturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/signatures");
  return <SignatureCenter />;
}
