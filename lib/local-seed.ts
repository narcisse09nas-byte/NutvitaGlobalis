import { articles, formations } from "@/data/content";
import { sitePages } from "@/data/site-pages";

const clientId = "local-client-demo";
const now = new Date();
const date = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86400000).toISOString();
const amount = (value: string) => Number(value.replace(/[^0-9]/g, ""));

export const localClientUser = {
  id: clientId,
  email: "client@nutvitaglobalis.com",
  user_metadata: { full_name: "Client demonstration" },
};
export const localPartnerUser = { id: "local-partner-user", email: "partenaire@nutvitaglobalis.com", user_metadata: { full_name: "Dr Amina Partenaire" } };

export const localSeed: Record<string, Array<Record<string, any>>> = {
  site_pages: sitePages.map(page => ({ ...page, id: page.page_key, updated_at: date(0) })),
  articles: articles.map((article, index) => ({
    id: `local-article-${index + 1}`,
    title: article.title,
    slug: article.slug,
    category: article.category,
    image_url: article.image,
    excerpt: article.excerpt,
    content: article.content || `<p>${article.excerpt}</p><p>Article initial importe depuis le site public. Vous pouvez maintenant completer son contenu depuis l'administration.</p>`,
    author: article.author || "Equipe NutVitaGlobalis",
    published_at: date(index * 7),
    status: "published",
    access_type: article.accessType || "free",
    featured: index < 3,
    seo_title: article.seoTitle || article.title,
    seo_description: article.seoDescription || article.excerpt,
    created_at: date(50 + index),
    updated_at: date(index),
  })),
  formations: formations.map((formation, index) => ({
    id: `local-formation-${index + 1}`,
    title: formation.title,
    short_description: `Formation pratique en ${formation.title.toLowerCase()}.`,
    description: `<p>Parcours de formation NutVitaGlobalis consacre a ${formation.title.toLowerCase()}.</p>`,
    image_url: formation.image,
    duration: formation.duration,
    level: formation.level,
    price: amount(formation.price),
    moodle_url: "",
    category: "Nutrition",
    status: "published",
    featured: index < 2,
    created_at: date(40 + index),
    updated_at: date(index),
  })),
  teleconseils: [
    ["Perte de poids", "Un plan realiste pour retrouver votre equilibre sans regime restrictif.", "Adultes souhaitant perdre du poids"],
    ["Diabete", "Adaptez votre alimentation a votre traitement et a vos habitudes.", "Personnes vivant avec le diabete"],
    ["Femme enceinte", "Un accompagnement nutritionnel a chaque trimestre de grossesse.", "Femmes enceintes"],
    ["Nutrition infantile", "Des reperes personnalises de la diversification aux premiers repas.", "Parents et jeunes enfants"],
  ].map(([name, description, target_audience], index) => ({ id: `local-pack-${index + 1}`, name, description, target_audience, duration: "45 minutes", price: 15000, whatsapp_url: "", status: "active", featured: index < 3, created_at: date(30 + index), updated_at: date(index) })),
  temoignages: [
    { name: "Aicha M.", role: "Cliente suivi sante", testimony: "Grace au suivi, j'ai retrouve une alimentation sereine et adaptee a mon diabete." },
    { name: "Dr Koffi A.", role: "Professionnel de sante", testimony: "Une formation claire, pratique et directement utile sur le terrain." },
    { name: "Mariam D.", role: "Maman", testimony: "J'ai enfin compris comment diversifier les repas de mon bebe sans stress." },
  ].map((item, index) => ({ id: `local-testimonial-${index + 1}`, ...item, photo_url: "", rating: 5, status: "visible", created_at: date(20 + index), updated_at: date(index) })),
  ressources_premium: [
    { id: "local-premium-1", title: "Guide de planification des repas", description: "Un guide pratique pour organiser des menus equilibres.", image_url: "", file_url: "", price: 5000, status: "draft", access_type: "paid", featured: true, created_at: date(10), updated_at: date(1) },
  ],
  homepage_settings: [{ id: 1, hero_title: "Nutrition, sante et bien-etre pour tous", slogan: "La sante commence dans l'assiette", presentation: "Des formations de qualite, des conseils d'experts et des ressources fiables pour prendre soin de vous et de vos proches.", hero_image_url: "/images/hero-nutvita.png", primary_button_label: "Decouvrir nos formations", primary_button_url: "/formations", secondary_button_label: "Reserver un teleconseil", secondary_button_url: "/teleconseils", newsletter_title: "Recevez nos conseils nutrition", newsletter_text: "Des informations fiables et pratiques directement dans votre boite email.", services: [{ title: "Formations certifiantes", text: "Developpez des competences concretes avec des parcours concus par des experts." }, { title: "Teleconseils nutritionnels", text: "Echangez a distance avec un professionnel et obtenez des conseils adaptes." }, { title: "Suivi personnalise", text: "Avancez durablement grace a un accompagnement qui respecte votre quotidien." }], updated_at: date(0) }],
  client_profiles: [{ id: clientId, email: localClientUser.email, login_email: localClientUser.email, username: "client.demo", client_number: "NVG-C-0001", full_name: "Client demonstration", whatsapp_phone: "+237 600 000 000", country: "Cameroun", country_code: "CM", state_region: "Centre", city: "Yaounde", medical_history: ["Diabete"], allergies: [], created_at: date(120) }],
  subscriptions: [{ id: "local-subscription-1", client_id: clientId, child_id: null, plan_id: "health-yearly", status: "active", started_at: date(30), expires_at: date(-335), created_at: date(30), subscription_plans: { name: "Suivi Sante Autonome", tier: "basic" } }],
  subscription_plans: [{ id: "health-yearly", name: "Suivi Sante Autonome", tier: "basic", service_type: "health_tracking", duration_months: 12, price_excluding_tax: 10000, currency: "XOF", active: true, features: ["Tableau de bord", "Graphiques", "Analyse simplifiee"] }, { id: "child-growth-yearly", name: "Suivi Croissance Enfant", tier: "basic", service_type: "child_growth", duration_months: 12, price_excluding_tax: 10000, currency: "XOF", active: true, features: ["Mesures de croissance", "Courbes", "Conseils aux parents"] }],
  tax_rates: [{ id: "local-tax-cm", name: "TVA Cameroun", country: "Cameroun", country_code: "CM", rate: 19.25, active: true, applies_to_formations: true, applies_to_consultations: true, applies_to_subscriptions: true, effective_from: "2020-01-01", effective_to: null }],
  payments: [{ id: "local-payment-1", client_id: clientId, product_name: "Suivi Sante Autonome - 12 mois", purchase_type: "subscription", amount: 10000, price_excluding_tax: 10000, tax_amount: 1925, total_including_tax: 11925, currency: "XOF", status: "successful", payment_method: "Mobile Money", created_at: date(30) }],
  invoices: [{ id: "local-invoice-1", client_id: clientId, invoice_number: "NVG-DEMO-0001", product_name: "Suivi Sante Autonome - 12 mois", price_excluding_tax: 10000, tax_amount: 1925, total_including_tax: 11925, currency: "XOF", status: "paid", payment_method: "Mobile Money", file_path: "", issued_at: date(30), created_at: date(30) }],
  formation_enrollments: [{ id: "local-enrollment-1", client_id: clientId, formation_id: "local-formation-2", status: "active", access_url: "", enrolled_at: date(20), formations: { title: formations[1].title, image_url: formations[1].image, moodle_url: "" } }],
  consultation_bookings: [{ id: "local-booking-1", client_id: clientId, teleconseil_id: "local-pack-2", status: "confirmed", scheduled_at: date(-7), access_starts_at: date(30), access_expires_at: date(-60), renewal_price_xof: 10000, preferred_slots: [], created_at: date(30), teleconseils: { name: "Diabete", duration: "45 minutes" } }],
  client_notifications: [{ id: "local-notification-1", client_id: clientId, title: "Bienvenue dans votre espace client", message: "Votre abonnement annuel de demonstration est actif.", read: false, created_at: date(30) }],
  anthropometric_measurements: [90, 60, 30, 0].map((daysAgo, index) => ({ id: `local-anthro-${index}`, client_id: clientId, measured_at: date(daysAgo), weight_kg: 82 - index * 1.4, height_cm: 170, bmi: Number(((82 - index * 1.4) / 1.7 ** 2).toFixed(1)), waist_cm: 96 - index, hip_cm: 104 - index * .5, created_at: date(daysAgo) })),
  biological_measurements: [90, 60, 30, 0].map((daysAgo, index) => ({ id: `local-biology-${index}`, client_id: clientId, measured_at: date(daysAgo), glucose: 1.35 - index * .06, hba1c: 7.2 - index * .15, total_cholesterol: 2.1 - index * .05, systolic_pressure: 138 - index * 3, diastolic_pressure: 88 - index * 2, created_at: date(daysAgo) })),
  food_history: [21, 14, 7, 0].map((daysAgo, index) => ({ id: `local-food-${index}`, client_id: clientId, entry_date: date(daysAgo), record_type: "journal", content: { calories: 2200 - index * 100, protein_g: 70 + index * 2 }, notes: "Journee alimentaire de demonstration", created_at: date(daysAgo) })),
  nutrition_consultations: [],
  ai_insights: [{ id: "local-insight-1", client_id: clientId, professional_summary: "Diminution progressive du poids avec amelioration des indicateurs glycemiques.", public_summary: "Votre poids et votre glycemie evoluent dans la bonne direction. Continuez vos efforts reguliers.", improvements: ["Poids en diminution", "Glycemie mieux controlee"], risks: [], created_at: date(0) }],
  alerts: [],
  health_reports: [{ id: "local-report-1", client_id: clientId, title: "Rapport nutritionnel de demonstration", period_start: date(90), period_end: date(0), file_path: "", created_at: date(0) }],
  children: [], child_growth_measurements: [], child_growth_analyses: [], child_growth_alerts: [], child_growth_reports: [], contracts: [],
  dietitian_profiles: [{ id: "local-partner-1", candidate_id: localPartnerUser.id, application_id: "local-application-partner", status: "active", full_name: "Dr Amina Partenaire", specialties: ["Diabete", "Nutrition clinique"], short_bio: "Dieteticienne-nutritionniste partenaire NutVitaGlobalis.", languages: ["Francais", "Anglais"], availability: "Lundi au vendredi", rate: 15000, internal_quality_score: 92, created_at: date(200) }],
  partner_consultations: [{ id: "local-consultation-1", partner_id: "local-partner-1", client_id: clientId, source: "onsite", status: "completed", scheduled_at: date(14), completed_at: date(14), reason: "Suivi du diabete", summary: "Amelioration de l'organisation des repas.", objectives: "Stabiliser la glycemie", recommendations: "Maintenir trois repas reguliers.", amount: 15000, currency: "XOF", payment_status: "paid", payment_method: "especes", client_profiles: { id: clientId, full_name: "Client demonstration", username: "client.demo", client_number: "NVG-C-0001", email: localClientUser.email } }, { id: "local-consultation-2", partner_id: "local-partner-1", client_id: clientId, source: "online", status: "planned", scheduled_at: date(-7), reason: "Controle mensuel", amount: 15000, currency: "XOF", payment_status: "paid", payment_method: "mobile_money", client_profiles: { id: clientId, full_name: "Client demonstration", username: "client.demo", client_number: "NVG-C-0001", email: localClientUser.email } }],
  partner_ledger: [{ id: "local-ledger-1", partner_id: "local-partner-1", consultation_id: "local-consultation-1", entry_type: "earning", description: "Consultation sur site - Client demonstration", amount: 15000, currency: "XOF", status: "approved", occurred_at: date(14) }],
  collaboration_conversations: [{ id: "local-support-client", title: "Support NutVitaGlobalis", conversation_type: "support", created_by: "local-admin-user", created_at: date(35), updated_at: date(0) }, { id: "local-conversation-1", title: "Equipe sante NutVitaGlobalis", conversation_type: "team", created_by: localPartnerUser.id, created_at: date(20), updated_at: date(0) }, { id: "local-conversation-client", title: "Suivi expert - Client demonstration", conversation_type: "consultation", consultation_id: "local-booking-1", created_by: localPartnerUser.id, created_at: date(14), updated_at: date(1) }],
  collaboration_members: [{ id: "local-support-member-client", conversation_id: "local-support-client", user_id: clientId, member_role: "client", joined_at: date(35) }, { id: "local-support-member-admin", conversation_id: "local-support-client", user_id: "local-admin-user", member_role: "admin", joined_at: date(35) }, { id: "local-member-1", conversation_id: "local-conversation-1", user_id: localPartnerUser.id, member_role: "partner", joined_at: date(20) }, { id: "local-member-2", conversation_id: "local-conversation-1", user_id: "local-admin-user", member_role: "admin", joined_at: date(20) }, { id: "local-member-3", conversation_id: "local-conversation-client", user_id: localPartnerUser.id, member_role: "partner", joined_at: date(14) }, { id: "local-member-4", conversation_id: "local-conversation-client", user_id: clientId, member_role: "client", joined_at: date(14) }],
  collaboration_messages: [{ id: "local-support-message", conversation_id: "local-support-client", sender_id: "local-admin-user", body: "Bonjour, le support administratif NutVitaGlobalis est a votre ecoute.", attachment_path: null, attachment_name: null, created_at: date(2) }, { id: "local-message-1", conversation_id: "local-conversation-1", sender_id: "local-admin-user", body: "Bienvenue dans l'espace de collaboration NutVitaGlobalis.", attachment_path: null, attachment_name: null, created_at: date(2) }, { id: "local-message-2", conversation_id: "local-conversation-client", sender_id: localPartnerUser.id, body: "Bonjour, votre prochain controle est bien enregistre.", attachment_path: null, attachment_name: null, created_at: date(1) }],
  collaboration_calls: [{ id: "local-call-1", conversation_id: "local-conversation-1", title: "Reunion equipe sante", provider: "jitsi", room_name: "NutVitaGlobalis-Equipe-Sante-Demo", scheduled_at: date(-2), duration_minutes: 45, status: "scheduled", created_by: "local-admin-user", created_at: date(5) }],
  staff_profiles: [{ id: "local-admin-user", full_name: "Equipe Administration", email: "contact@nutvitaglobalis.com", department: "administration", job_title: "Administration", status: "active", can_message: true, can_video_call: true }],
};

export function getLocalSeed(table: string) {
  return (localSeed[table] || []).map(row => ({ ...row }));
}
