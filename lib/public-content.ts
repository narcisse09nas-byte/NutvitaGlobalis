import { articles as fallbackArticles, formations as fallbackFormations, type Article } from "@/data/content";
import { getCurrentLocale } from "@/lib/i18n-server";
import { pickLocalized, type Locale } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function mapArticle(a: Record<string, any>, locale: Locale): Article {
  return {
    id: a.id,
    slug: pickLocalized(a, "slug", locale),
    title: pickLocalized(a, "title", locale),
    excerpt: pickLocalized(a, "excerpt", locale),
    category: pickLocalized(a, "category", locale),
    image: a.image_url || fallbackArticles[0].image,
    readTime: "6 min",
    content: pickLocalized(a, "content", locale),
    author: a.author,
    seoTitle: pickLocalized(a, "seo_title", locale),
    seoDescription: pickLocalized(a, "seo_description", locale),
    accessType: a.access_type,
  };
}

export async function getArticles(featured = false): Promise<Article[]> {
  const locale = await getCurrentLocale();
  if (!hasSupabaseConfig()) return featured ? fallbackArticles.slice(0, 6) : fallbackArticles;
  const supabase = await createClient();
  let query = supabase.from("articles").select("*").in("publication_locale_status", locale === "en" ? ["en", "both"] : ["fr", "both"]).eq("status", "published").order("published_at", { ascending: false });
  if (featured) query = query.eq("featured", true);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(a => mapArticle(a, locale));
}

export async function getArticle(slug: string) {
  const locale = await getCurrentLocale();
  const fallback = fallbackArticles.find(a => a.slug === slug);
  if (!hasSupabaseConfig()) return fallback;
  const supabase = await createClient();
  const column = locale === "en" ? "slug_en" : "slug";
  const { data } = await supabase.from("articles").select("*").eq(column, slug).maybeSingle();
  return data ? mapArticle(data, locale) : undefined;
}

export async function getFormations(featured = false) {
  const locale = await getCurrentLocale();
  if (!hasSupabaseConfig()) return fallbackFormations;
  const supabase = await createClient();
  let query = supabase.from("formations").select("*").in("publication_locale_status", locale === "en" ? ["en", "both"] : ["fr", "both"]).eq("status", "published").order("created_at", { ascending: false });
  if (featured) query = query.eq("featured", true);
  const { data, error } = await query;
  return error || !data ? [] : data.map(f => ({
    id: f.id,
    title: pickLocalized(f, "title", locale),
    shortDescription: pickLocalized(f, "short_description", locale),
    description: pickLocalized(f, "description", locale),
    duration: f.duration,
    level: f.level,
    price: `${Number(f.price).toLocaleString("fr-FR")} FCFA`,
    image: f.image_url || fallbackArticles[0].image,
    moodleUrl: f.moodle_url,
    category: pickLocalized(f, "category", locale),
  }));
}

export async function getTeleconseils() {
  const locale = await getCurrentLocale();
  if (!hasSupabaseConfig()) return null;
  const { data } = await (await createClient()).from("teleconseils").select("*").eq("status", "active").order("created_at");
  return data?.map(item => ({ ...item, name: pickLocalized(item, "name", locale), description: pickLocalized(item, "description", locale) }));
}

export async function getPremiumResources() {
  const locale = await getCurrentLocale();
  if (!hasSupabaseConfig()) return null;
  const { data } = await (await createClient()).from("ressources_premium").select("*").in("publication_locale_status", locale === "en" ? ["en", "both"] : ["fr", "both"]).eq("status", "published").order("created_at", { ascending: false });
  return data?.map(item => ({ ...item, title: pickLocalized(item, "title", locale), description: pickLocalized(item, "description", locale) }));
}

export async function getTestimonials() {
  if (!hasSupabaseConfig()) return null;
  const { data } = await (await createClient()).from("temoignages").select("*").eq("status", "visible").order("created_at", { ascending: false });
  return data;
}

export async function getHomepage() {
  if (!hasSupabaseConfig()) return null;
  const { data } = await (await createClient()).from("homepage_settings").select("*").eq("id", 1).maybeSingle();
  return data;
}
