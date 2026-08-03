import { defaultSitePage, type SitePageContent } from "@/data/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
const englishFallbacks: Record<string, Partial<SitePageContent>> = {
  ressources: { eyebrow: "Learn", title: "Resources for better decisions", description: "Practical articles, professional guides and tools based on reliable, contextualized information.", sections: [] },
  formations: { eyebrow: "Learn", title: "Skills that transform practice", description: "Flexible, practical learning paths designed by nutrition and public health professionals.", sections: [] },
  teleconseils: { eyebrow: "By your side", title: "Your nutritionist, wherever you are", description: "A confidential video or WhatsApp consultation followed by recommendations adapted to your health and daily life.", sections: [] },
  "a-propos": { eyebrow: "Who we are", title: "Science serving healthier lives", description: "NutVitaGlobalis was founded on one conviction: clear, relevant and human guidance can sustainably improve health.", sections: [
    { title: "Mission", text: "Make reliable nutrition expertise accessible to families, communities and professionals." },
    { title: "Vision", text: "An Africa where everyone has the knowledge needed to make nutrition a driver of health." },
    { title: "Values", text: "Scientific rigor, proximity, cultural respect, prevention and lasting impact guide every action." },
    { title: "Expertise", text: "Clinical nutrition, public health, food safety, training and behavioral support." },
  ] },
  contact: { eyebrow: "Let's talk", title: "Have a question? Our team is here to help", description: "Courses, support or partnerships: write to us and we will get back to you promptly.", sections: [{ title: "Stay in touch", text: "We generally reply within one business day." }] },
  "suivi-sante": { eyebrow: "Annual self-monitoring", title: "Understand your health indicators day after day", description: "Record your data, visualize trends and receive cautious analyses without a mandatory consultation.", sections: [{ title: "Autonomous Health Monitoring", text: "Annual access with history, trends and cautious guidance." }, { title: "Child Growth", text: "Annual monitoring per child with history and growth charts." }] },
  "recherche-innovation": { eyebrow: "Research · Innovation · Consulting", title: "Turn data into decisions and ideas into impact", description: "We support institutions, organizations, companies and researchers worldwide, from design through impact measurement.", cta_label: "Discuss your project", sections: [
    { title: "Scientific research", text: "Rigorous protocols and actionable findings.", items: ["Quantitative, qualitative and mixed-method studies", "SMART, SENS, KAP, DHS, MICS, HEA and IPC surveys", "Systematic reviews, meta-analyses and operational research"] },
    { title: "Innovation", text: "Digital and methodological solutions tailored to each context.", items: ["Digital health and data collection tools", "Data analysis, GIS and artificial intelligence", "Solution design and experimentation"] },
    { title: "Strategic consulting", text: "End-to-end support aligned with international standards.", items: ["Project and programme design", "Monitoring, evaluation, learning and knowledge management", "Capacity strengthening and technical assistance"] },
    { title: "Our fields", items: ["Public health and nutrition", "Food security", "Data and information systems", "Project, programme and portfolio management"] },
    { title: "Our approach", items: ["Understand", "Design", "Implement", "Measure", "Learn and scale"] },
    { title: "Why NutVitaGlobalis", items: ["Evidence-informed decisions", "International multidisciplinary expertise", "Context-sensitive solutions", "WHO, UNICEF, FAO and Sphere standards"] },
  ] },  recrutement: { eyebrow: "Join us", title: "Join the NutVitaGlobalis dietitian-nutritionist network", description: "Use your expertise to support patients and accessible, rigorous nutrition programmes adapted to local realities.", cta_label: "Submit my application", sections: [
    { title: "An engaged professional community", text: "Join qualified professionals working in counselling, personalized monitoring, clinical nutrition and online programmes." },
    { title: "Selection process", items: ["Application", "Administrative review", "Online written test", "Video interview", "Final validation", "Network onboarding"] },
  ] },
};


export async function getSitePage(pageKey: string): Promise<SitePageContent | undefined> {
  const locale = await getCurrentLocale();
  const defaultFallback = defaultSitePage(pageKey);
  const fallback = locale === "en" && defaultFallback ? { ...defaultFallback, ...englishFallbacks[pageKey] } as SitePageContent : defaultFallback;
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
    cta_label: pickLocalized(data, "cta_label", locale) || fallback.cta_label,
  } as SitePageContent;
}
