import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import CadrageTabs from "@/components/op-management/CadrageTabs";
import ProjectIdentificationForm from "@/components/op-management/ProjectIdentificationForm";
import { createClient } from "@/lib/supabase/server";
import { getProject, listPortfolios, listPrograms } from "@/lib/ppm/queries";

export default async function CadrageIdentificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/cadrage/identification`)}`);
  const name = user.user_metadata?.full_name || user.email || "Utilisateur";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [portfolios, programs] = await Promise.all([listPortfolios(supabase), listPrograms(supabase)]);

  return <PPMShell name={name} breadcrumbs={[{ href: "/op-management", label: "Vue d'ensemble" }, { href: "/op-management/projets", label: "Projets" }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/cadrage/identification`, label: "Cadrage" }]}>
    <ProjectShell project={project}>
      <div className="grid gap-5">
        <CadrageTabs projectId={id} />
        <ProjectIdentificationForm project={project} portfolios={portfolios} programs={programs} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
