import { defaultSitePage, type SitePageContent } from "@/data/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function getSitePage(pageKey: string): Promise<SitePageContent | undefined> {
  const locale = await getCurrentLocale();
  const fallback = defaultSitePage(pageKey);
  if (!hasSupabaseConfig()) return fallback;
  const { data } = await (await createClient()).from("site_pages").select("*").eq("page_key", pageKey).maybeSingle();
  if (!data || !fallback) return fallback;
  return {
    ...fallback,
    ...data,
    eyebrow: pickLocalized(data, "eyebrow", locale) || fallback.eyebrow,
    title: pickLocalized(data, "title", locale) || fallback.title,
    description: pickLocalized(data, "description", locale) || fallback.description,
    seo_title: pickLocalized(data, "seo_title", locale),
    seo_description: pickLocalized(data, "seo_description", locale),
    sections: Array.isArray(data.sections_en) && locale === "en" ? data.sections_en : Array.isArray(data.sections) ? data.sections : fallback.sections,
  } as SitePageContent;
}
