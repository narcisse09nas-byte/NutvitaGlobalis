import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import SitePageEditor from "@/components/admin/SitePageEditor";
import { requireAdmin } from "@/lib/admin";
import { defaultSitePage } from "@/data/site-pages";

export default async function Page({ params }: { params: Promise<{ pageKey: string }> }) {
  const { pageKey } = await params;
  const fallback = defaultSitePage(pageKey);
  if (!fallback) notFound();
  const { supabase, admin } = await requireAdmin();
  const { data } = await supabase.from("site_pages").select("*").eq("page_key", pageKey).maybeSingle();
  const initial = { ...fallback, ...(data || {}), sections: Array.isArray(data?.sections) ? data.sections : fallback.sections };
  return <AdminShell name={admin.full_name || admin.email}><div className="mb-7"><p className="text-sm font-bold uppercase tracking-widest text-leaf">Pages du site</p><h1 className="text-3xl font-black">{fallback.label}</h1><p className="mt-2 text-slate-500">Modifiez les textes visibles sur {fallback.path}.</p></div><SitePageEditor initial={initial}/></AdminShell>;
}
