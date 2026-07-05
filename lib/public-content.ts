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
  const locale = await getCurrentLocale();
  const packServices = locale === "en" ? [
    { title: "Weight Loss Pack", text: "3 months of professional support with Premium Autonomous Health Monitoring included." },
    { title: "Diabetes Pack", text: "3 months of nutrition support with Premium Autonomous Health Monitoring included." },
    { title: "Pregnancy Pack", text: "Premium Growth Monitoring included for 3 months, plus Premium Autonomous Health Monitoring for 4 months." },
    { title: "Infant Nutrition Pack", text: "3 months of feeding guidance with Premium Child Growth Monitoring included." },
  ] : [
    { title: "Pack Perte de poids", text: "3 mois d'accompagnement professionnel avec le Suivi Sante Autonome Premium inclus." },
    { title: "Pack Diabete", text: "3 mois de suivi nutritionnel avec le Suivi Sante Autonome Premium inclus." },
    { title: "Pack Femme enceinte", text: "Suivi Croissance Premium inclus 3 mois, plus Suivi Sante Autonome Premium inclus 4 mois." },
    { title: "Pack Nutrition infantile", text: "3 mois de conseils alimentaires avec le Suivi Croissance Enfant Premium inclus." },
  ];
  if (!hasSupabaseConfig()) return { services: [
    { title: locale === "en" ? "Certified courses" : "Formations certifiantes", text: locale === "en" ? "Build practical skills through expert-designed learning paths." : "Developpez des competences concretes avec des parcours concus par des experts." },
    { title: locale === "en" ? "Nutrition counselling" : "Teleconseils nutritionnels", text: locale === "en" ? "Talk remotely with a professional and receive tailored guidance." : "Echangez a distance avec un professionnel et obtenez des conseils adaptes." },
    { title: locale === "en" ? "Personalized monitoring" : "Suivi personnalise", text: locale === "en" ? "Make lasting progress with support that fits your daily life." : "Avancez durablement grace a un accompagnement qui respecte votre quotidien." },
    ...packServices,
  ] };
  const { data } = await (await createClient()).from("homepage_settings").select("*").eq("id", 1).maybeSingle();
  return data ? { ...data, services: [...(Array.isArray(data.services) ? data.services : []), ...packServices] } : { services: packServices };
}

export async function getHomepageCommunity() {
  const locale = await getCurrentLocale();
  if (!hasSupabaseConfig()) return { locale, announcements: [], gallery: [], topics: [], messages: [] };
  const supabase = await createClient();
  const [{ data: announcements }, { data: gallery }, { data: topics }, { data: messages }] = await Promise.all([
    supabase.from("homepage_announcements").select("*").eq("status", "published").order("published_at", { ascending: false }).limit(8),
    supabase.from("homepage_gallery_items").select("*").eq("status", "published").order("sort_order").order("created_at", { ascending: false }).limit(12),
    supabase.from("homepage_discussion_topics").select("*").in("status", ["open", "closed"]).order("created_at", { ascending: false }),
    supabase.from("homepage_discussion_messages").select("id,topic_id,author_name,message,created_at").eq("status", "approved").order("created_at", { ascending: false }).limit(30),
  ]);
  return { locale, announcements: announcements || [], gallery: gallery || [], topics: topics || [], messages: messages || [] };
}
