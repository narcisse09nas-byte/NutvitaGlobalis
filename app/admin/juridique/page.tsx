import AdminShell from "@/components/admin/AdminShell";
import LegalDocumentManager from "@/components/admin/LegalDocumentManager";
import { requireAdmin } from "@/lib/admin";

export default async function LegalAdminPage() {
  const { supabase, admin } = await requireAdmin();
  const [{ data: documents }, { data: translations }, { data: versions }] = await Promise.all([
    supabase.from("legal_documents").select("*").order("document_key"),
    supabase.from("legal_translations").select("*").order("updated_at", { ascending: false }),
    supabase.from("legal_document_versions").select("*").order("created_at", { ascending: false }).limit(200),
  ]);
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><h1 className="text-3xl font-black">Module juridique</h1><p className="mt-2 text-slate-500">Documents pre-remplis bilingues, publication, versionnage, restauration et signatures.</p></div><LegalDocumentManager documents={documents || []} translations={translations || []} versions={versions || []} /></AdminShell>;
}
