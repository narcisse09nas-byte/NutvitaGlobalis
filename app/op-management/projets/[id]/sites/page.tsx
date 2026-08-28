import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import SiteRegister from "@/components/op-management/SiteRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getProject, listProjectSites, listSites } from "@/lib/ppm/queries";
export default async function SitesPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/sites`)}`);const project=await getProject(supabase,id);if(!project)notFound();const locale=await getCurrentLocale();const [sites,identifiedSites]=await Promise.all([listSites(supabase,id),listProjectSites(supabase,id)]);return <PPMShell name={user.user_metadata?.full_name||user.email||"Utilisateur"} locale={locale} breadcrumbs={[]}><ProjectShell project={project}><SiteRegister projectId={id} initial={sites} defaultCountry={project.country||""} identifiedSites={identifiedSites}/></ProjectShell></PPMShell>}
