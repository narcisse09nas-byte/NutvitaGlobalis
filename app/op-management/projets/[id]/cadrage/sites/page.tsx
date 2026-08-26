import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import SiteRegister from "@/components/op-management/SiteRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getProject, listSites } from "@/lib/ppm/queries";
export default async function SitesPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/connexion");const project=await getProject(supabase,id);if(!project)notFound();const locale=await getCurrentLocale();const sites=await listSites(supabase,id);return <PPMShell name={user.user_metadata?.full_name||user.email||"Utilisateur"} locale={locale} breadcrumbs={[]}><ProjectShell project={project}><div className="grid gap-5"><CadrageTabs projectId={id}/><SiteRegister projectId={id} initial={sites} defaultCountry={project.country || ""}/></div></ProjectShell></PPMShell>}