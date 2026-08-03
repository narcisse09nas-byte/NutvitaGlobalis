import { articles as fallbackArticles, formations as fallbackFormations, type Article } from "@/data/content";
import { getCurrentLocale } from "@/lib/i18n-server";
import { pickLocalized, type Locale } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { repairContent } from "@/lib/text-encoding";

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
const fallbackArticlesEn: Record<string, Pick<Article, "title" | "excerpt" | "category">> = {
  "nutrition-diabete": { title: "Eating well with diabetes", excerpt: "Simple guidance for balanced meals without giving up familiar local flavours.", category: "Clinical nutrition" },
  "prevenir-malnutrition-enfant": { title: "Preventing child malnutrition", excerpt: "Warning signs and essential actions that support healthy growth.", category: "Child health" },
  "assiette-africaine-equilibree": { title: "Building a balanced African plate", excerpt: "Find the right everyday balance of staples, proteins and vegetables.", category: "Well-being" },
  "grossesse-alimentation": { title: "Eating well during pregnancy", excerpt: "The nutrients that matter for the mother and the baby's development.", category: "Maternity" },
  "hygiene-alimentaire-maison": { title: "Five food hygiene rules", excerpt: "Reduce contamination risks in your kitchen through simple habits.", category: "Food safety" },
  "diversification-alimentaire": { title: "Successful complementary feeding", excerpt: "When to start, which foods to offer and how to respect your baby's pace.", category: "Infant nutrition" },
};

function localizedFallbackArticles(locale: Locale) {
  if (locale === "fr") return fallbackArticles;
  return fallbackArticles.map(article => ({ ...article, ...(fallbackArticlesEn[article.slug] || {}) }));
}

export async function getArticles(featured = false): Promise<Article[]> {
  const locale = await getCurrentLocale();
  if (!hasSupabaseConfig()) return featured ? localizedFallbackArticles(locale).slice(0, 6) : localizedFallbackArticles(locale);
  const supabase = await createClient();
  let query = supabase.from("articles").select("*").in("publication_locale_status", locale === "en" ? ["en", "both"] : ["fr", "both"]).eq("status", "published").order("published_at", { ascending: false });
  if (featured) query = query.eq("featured", true);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(a => mapArticle(a, locale));
}

export async function getArticle(slug: string) {
  const locale = await getCurrentLocale();
  const fallback = localizedFallbackArticles(locale).find(article => article.slug === slug);
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
  const { data } = await (await createClient()).rpc("list_premium_resource_catalog");
  return data?.map((item:any) => ({ ...item, title: pickLocalized(item, "title", locale), description: pickLocalized(item, "description", locale) }));
}

export async function getTestimonials() {
  if (!hasSupabaseConfig()) return null;
  const { data } = await (await createClient()).from("temoignages").select("*").eq("status", "visible").order("created_at", { ascending: false });
  return data;
}

export async function getHomepage() {
  const locale = await getCurrentLocale();
  const canonical = locale === "en" ? [
    { title: "Dietetic and nutrition consultations", text: "In-person or online consultations, personalized assessment, follow-up and professional nutrition guidance.", ctaLabel: "Access consultations", href: "/teleconseils" },
    { title: "Autonomous Health Monitoring", text: "Record your indicators, visualize trends and receive careful analyses in your secure space.", ctaLabel: "Discover the solution", href: "/suivi-sante" },
    { title: "Support applications", text: "Applications for acute malnutrition care, surveys and project, programme and portfolio management.", ctaLabel: "Explore applications", href: "/applications-support" },
    { title: "Certified training", text: "Practical, assessed certification pathways designed by nutrition, health and management experts.", ctaLabel: "Explore courses", href: "/formations" },
    { title: "Catering service", text: "Browse menus available in your city and order healthy meals for delivery.", ctaLabel: "Browse menus", href: "/restauration" },
    { title: "Scientific Research, Innovation & Strategic Consulting", text: "Research, data, AI and strategic support for institutions, organizations and businesses worldwide.", ctaLabel: "Discover the solution", href: "/recherche-innovation" },
  ] : [
    { title: "Consultations diététiques et nutritionnelles", text: "Consultations en présentiel ou en ligne, bilan personnalisé, suivi et orientation nutritionnelle professionnelle.", ctaLabel: "Accéder aux consultations", href: "/teleconseils" },
    { title: "Suivi Santé Autonome", text: "Enregistrez vos indicateurs, visualisez vos tendances et recevez des analyses prudentes dans votre espace sécurisé.", ctaLabel: "Découvrir la solution", href: "/suivi-sante" },
    { title: "Applications de support", text: "Applications dédiées à la malnutrition aiguë, aux enquêtes et à la gestion de projets, programmes et portefeuilles.", ctaLabel: "Explorer les applications", href: "/applications-support" },
    { title: "Formations certifiantes", text: "Parcours pratiques, évalués et certifiants conçus par des experts.", ctaLabel: "Explorer les formations", href: "/formations" },
    { title: "Service de restauration", text: "Consultez les menus disponibles dans votre ville et commandez des repas sains avec livraison.", ctaLabel: "Voir les menus", href: "/restauration" },
    { title: "Recherche scientifique, innovation et conseil stratégique", text: "Recherche, données, IA et conseil stratégique pour les institutions, organisations et entreprises partout dans le monde.", ctaLabel: "Découvrir la solution", href: "/recherche-innovation" },
  ];
  if (!hasSupabaseConfig()) return { services: canonical };
  const { data } = await (await createClient()).from("homepage_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return { services: canonical };
  const stored = locale === "en" && Array.isArray(data.services_en) ? repairContent(data.services_en) : locale === "fr" && Array.isArray(data.services) ? repairContent(data.services) : [];
  const patterns = [/consult|tele/i,/autonomous health|suivi sant[eé] autonome/i,/support application|applications de support/i,/certified training|formations certifiantes/i,/catering|restauration/i,/scientific|scientifique/i];
  const services = canonical.map((fallback,index) => ({...fallback,...(stored.find((item:any)=>patterns[index].test(String(item?.title||"")))||{})}));
  services[0].href="/teleconseils"; services[1].href="/suivi-sante"; services[2].href="/applications-support"; services[3].href="/formations"; services[4].href="/restauration"; services[5].href="/recherche-innovation";
  services[5].ctaLabel=locale==="en"?"Discover the solution":"Découvrir la solution";
  return repairContent({ ...data, hero_title: pickLocalized(data, "hero_title", locale), slogan: pickLocalized(data, "slogan", locale), presentation: pickLocalized(data, "presentation", locale), primary_button_label: pickLocalized(data, "primary_button_label", locale), secondary_button_label: pickLocalized(data, "secondary_button_label", locale), newsletter_title: pickLocalized(data, "newsletter_title", locale), newsletter_text: pickLocalized(data, "newsletter_text", locale), services });
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
