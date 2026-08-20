import { defaultSitePage, type SitePageContent } from "@/data/site-pages";
import { getCurrentLocale } from "@/lib/i18n-server";
import { pickLocalized } from "@/lib/i18n";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
const englishFallbacks: Record<string, Partial<SitePageContent>> = {
  "applications-support": { eyebrow: "Professional solutions", title: "Support applications\nbuilt for action", description: "Explore NutVitaGlobalis operational applications. Your permissions are verified when a solution opens.", cta_label: "View all applications", secondary_cta_label: "Request a demo", sections: [
    { title: "Secure access", text: "Verified authentication and permissions" }, { title: "Reliable data", text: "Rigorous collection and validated analysis" }, { title: "Informed decisions", text: "Relevant information at the right time" }, { title: "Measurable impact", text: "Continuous monitoring and tangible results" },
    { title: "Acute malnutrition care (NutriTrack)", text: "Digitalize the entire acute malnutrition care pathway, from screening to recovery follow-up, with reports compliant with national and international standards.", items: ["Fast screening and simplified admission", "Personalized clinical and nutritional follow-up", "Stock and supply management", "Automated alerts and reminders", "Performance and key indicator monitoring"] },
    { title: "Food security and nutrition survey support", text: "Design, collect and analyze reliable data for fast, evidence-based decisions.", items: ["Questionnaire design (SMART, MAD, FCS, rCSI...) and built-in templates", "Mobile & offline data collection (ODK/Kobo)", "Data cleaning, validation and management", "Built-in advanced analysis (Python)", "Interactive dashboards and visualizations", "Easy export (Excel, SPSS, Stata, PDF...)"] },
    { title: "Project, programme and portfolio management", text: "Plan, execute and track your projects efficiently, collaborate in real time and reach your goals faster.", items: ["Activity planning and monitoring", "Budget management and resource allocation", "Risk, issue and action tracking", "Key performance indicator (KPI) monitoring", "Dynamic dashboards and reports", "Integrated collaboration and document management"] },
    { title: "Security and compliance", text: "Protected data and respected international standards." }, { title: "Interoperability", text: "Seamless integration with your existing tools and systems." }, { title: "Available everywhere", text: "Access your data online or offline, on every device." }, { title: "Responsive support", text: "Technical assistance and personalized support." }
  ] },  ressources: { eyebrow: "Learn", title: "Resources for better decisions", description: "Practical articles, professional guides and tools based on reliable, contextualized information.", sections: [] },
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
  const localizedDefault = locale === "en" && defaultFallback ? {
    ...defaultFallback,
    eyebrow: defaultFallback.eyebrow_en || defaultFallback.eyebrow,
    title: defaultFallback.title_en || defaultFallback.title,
    description: defaultFallback.description_en || defaultFallback.description,
    sections: defaultFallback.sections_en?.length ? defaultFallback.sections_en : defaultFallback.sections,
    cta_label: defaultFallback.cta_label_en || defaultFallback.cta_label,
    secondary_cta_label: defaultFallback.secondary_cta_label_en || defaultFallback.secondary_cta_label,
  } as SitePageContent : defaultFallback;
  const englishOverride = englishFallbacks[pageKey];
  const fallback = locale === "en" && localizedDefault && englishOverride ? {
    ...localizedDefault,
    ...englishOverride,
    sections: englishOverride.sections?.length ? englishOverride.sections : localizedDefault.sections,
  } as SitePageContent : localizedDefault;
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
    sections: Array.isArray(data.sections_en) && locale === "en" && data.sections_en.length ? data.sections_en : Array.isArray(data.sections) && data.sections.length ? data.sections : fallback.sections,
    cta_label: pickLocalized(data, "cta_label", locale) || fallback.cta_label,
    secondary_cta_label: pickLocalized(data, "secondary_cta_label", locale) || fallback.secondary_cta_label,
  } as SitePageContent;
}
