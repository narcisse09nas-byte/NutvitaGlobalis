import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ProjectContextForm from "@/components/op-management/ProjectContextForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import { getProject } from "@/lib/ppm/queries";

export default async function CadrageContextPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/contexte`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const project = await getProject(supabase, id);
  if (!project) notFound();

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/contexte`, label: bc(locale, "scoping") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <CadrageTabs projectId={id} />
        <ProjectContextForm project={project} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
