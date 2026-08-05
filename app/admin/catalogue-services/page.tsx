import AdminShell from "@/components/admin/AdminShell";
import ClientServiceCatalogEditor from "@/components/admin/ClientServiceCatalogEditor";
import {requireAdmin} from "@/lib/admin";
import {normalizeClientServiceCatalog} from "@/lib/client-service-catalog";
export default async function Page(){const{supabase,admin}=await requireAdmin(),{data}=await supabase.from("client_service_catalog_settings").select("*").eq("id",1).maybeSingle();return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><p className="text-sm font-black uppercase tracking-widest text-leaf">Catalogue client</p><h1 className="text-4xl font-black">Nos services</h1><p className="mt-3 text-slate-500">Administrez les cartes, textes, images, boutons, ordre et traductions FR/EN de la page d’achat.</p></div><ClientServiceCatalogEditor initial={normalizeClientServiceCatalog(data)}/></AdminShell>}
