import AdminShell from "@/components/admin/AdminShell";
import ResearchInnovationEditor from "@/components/admin/ResearchInnovationEditor";
import { requireAdmin } from "@/lib/admin";
import { normalizeResearchSettings } from "@/lib/research-innovation";
export default async function Page(){const{supabase,admin}=await requireAdmin(),{data}=await supabase.from("research_innovation_settings").select("*").eq("id",1).maybeSingle();return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><p className="text-sm font-black uppercase tracking-widest text-leaf">Vitrine stratégique</p><h1 className="text-4xl font-black">Recherche, Innovation & Conseil</h1><p className="mt-3 text-slate-500">Administrez intégralement la page, les expertises, réalisations, médias, témoignages et le SEO en français et en anglais.</p></div><ResearchInnovationEditor initial={normalizeResearchSettings(data)}/></AdminShell>}
