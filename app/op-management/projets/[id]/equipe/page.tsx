import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import ResourceManager from "@/components/op-management/ResourceManager";
import SupplierRegister from "@/components/op-management/SupplierRegister";
import StakeholderRegister from "@/components/op-management/StakeholderRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { bc } from "@/lib/ppm/breadcrumb-labels";
import {
  getProject, listResourceAssignments, listResources, listActivities, listOrganizationStaff, listOrganizationSuppliers,
  listProjectContracts, listStakeholders, listSuppliers,
} from "@/lib/ppm/queries";

// Refinement program, Wave 1: Staff, Suppliers, Stakeholders, Sites and Assets need to be visible
// and known from project entry, since they feed dozens of downstream dropdowns (responsable,
// fournisseur, partie prenante, localisation...). This tab is surfaced right after Cadrage.
export default async function ProjectEquipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/op-management/projets/${id}/equipe`)}`);
  const name = user.user_metadata?.full_name || user.email || ((await getCurrentLocale()) === "en" ? "User" : "Utilisateur");
  const locale = await getCurrentLocale();
  const en = locale === "en";
  const project = await getProject(supabase, id);
  if (!project) notFound();
  const [resources, assignments, activities, suppliers, stakeholders, orgStaff, orgSuppliers, contracts] = await Promise.all([
    listResources(supabase, id), listResourceAssignments(supabase, id), listActivities(supabase, id),
    listSuppliers(supabase, id), listStakeholders(supabase, id),
    listOrganizationStaff(supabase, project.organization_id), listOrganizationSuppliers(supabase, project.organization_id), listProjectContracts(supabase, id),
  ]);
  const staff = resources.filter(item => item.type === "human" || item.type === "consultant");

  return <PPMShell name={name} locale={locale} breadcrumbs={[{ href: "/op-management", label: bc(locale, "overview") }, { href: "/op-management/projets", label: bc(locale, "projects") }, { href: `/op-management/projets/${id}`, label: project.name }, { href: `/op-management/projets/${id}/equipe`, label: bc(locale, "team") }]}>
    <ProjectShell project={project}>
      <div className="grid gap-8">
        <ResourceManager projectId={id} initial={staff} initialAssignments={assignments} activities={activities} title={en ? "Staff & consultants" : "Staff & consultants"} allowedTypes={["human", "consultant"]} orgStaff={orgStaff} />
        <SupplierRegister projectId={id} initial={suppliers} orgSuppliers={orgSuppliers} contracts={contracts} />
        <StakeholderRegister projectId={id} initial={stakeholders} />
      </div>
    </ProjectShell>
  </PPMShell>;
}
