import { notFound, redirect } from "next/navigation";
import PPMShell from "@/components/op-management/PPMShell";
import ProjectShell from "@/components/op-management/ProjectShell";
import MiseEnOeuvreTabs from "@/components/op-management/MiseEnOeuvreTabs";
import ProcurementReceiptRegister from "@/components/op-management/ProcurementReceiptRegister";
import { createClient } from "@/lib/supabase/server";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getProject, listProcurementItems, listProcurementReceipts, listProcurementReceiptLines, listProcurementReceiptCriteria, listReceiptCommitteeMembers, listProcurementReceiptEvidence, listResources } from "@/lib/ppm/queries";

export default async function ReceptionsPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{po?:string}>}) {
 const {id}=await params;const {po}=await searchParams;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/connexion");const project=await getProject(supabase,id);if(!project)notFound();const [items,receipts,resources]=await Promise.all([listProcurementItems(supabase,id),listProcurementReceipts(supabase,id),listResources(supabase,id)]);const ids=receipts.map(x=>x.id);const [lines,criteria,committee,evidence]=await Promise.all([listProcurementReceiptLines(supabase,ids),listProcurementReceiptCriteria(supabase,ids),listReceiptCommitteeMembers(supabase,ids),listProcurementReceiptEvidence(supabase,ids)]);const locale=await getCurrentLocale();return <PPMShell name={user.user_metadata?.full_name||user.email||"Utilisateur"} locale={locale} breadcrumbs={[]}><ProjectShell project={project}><div className="grid gap-5"><MiseEnOeuvreTabs projectId={id}/><ProcurementReceiptRegister projectId={id} initial={receipts} items={items} staff={resources.filter(x=>x.type==="human"||x.type==="consultant")} initialLines={lines} initialCriteria={criteria} initialCommittee={committee} initialEvidence={evidence} initialPo={po}/></div></ProjectShell></PPMShell>
}
