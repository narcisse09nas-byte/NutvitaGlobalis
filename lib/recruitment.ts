import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export async function requireCandidate(){
  if(!hasSupabaseConfig())redirect('/candidat?setup=1');
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/candidat');
  return {supabase,user};
}
