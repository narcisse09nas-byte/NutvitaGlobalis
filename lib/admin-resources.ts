export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "richtext" | "number" | "date" | "datetime" | "select" | "boolean" | "url";
  required?: boolean;
  options?: string[];
  help?: string;
  locale?: "fr" | "en" | "both";
};
export type ResourceConfig = { table: string; title: string; singular: string; titleField: string; statusField?: string; fields: Field[] };

export const resources: Record<string, ResourceConfig> = {
  articles: { table: "articles", title: "Articles", singular: "article", titleField: "title", statusField: "status", fields: [
    { name: "publication_locale_status", label: "Publication langue", type: "select", options: ["fr", "en", "both"], locale: "both" },
    { name: "title", label: "Titre", required: true, locale: "fr" },
    { name: "slug", label: "Slug URL", help: "Genere automatiquement depuis le titre si vide.", locale: "fr" },
    { name: "category", label: "Categorie", required: true, locale: "fr" },
    { name: "excerpt", label: "Resume court", type: "textarea", required: true, locale: "fr" },
    { name: "content", label: "Contenu complet", type: "richtext", required: true, locale: "fr" },
    { name: "seo_title", label: "SEO title", locale: "fr" },
    { name: "seo_description", label: "SEO description", type: "textarea", locale: "fr" },
    { name: "title_en", label: "Title", locale: "en" },
    { name: "slug_en", label: "English slug", locale: "en" },
    { name: "category_en", label: "Category", locale: "en" },
    { name: "excerpt_en", label: "Short excerpt", type: "textarea", locale: "en" },
    { name: "content_en", label: "Full content", type: "richtext", locale: "en" },
    { name: "seo_title_en", label: "SEO title", locale: "en" },
    { name: "seo_description_en", label: "SEO description", type: "textarea", locale: "en" },
    { name: "image_url", label: "Image principale", type: "url", locale: "both" },
    { name: "author", label: "Auteur", locale: "both" },
    { name: "published_at", label: "Date de publication", type: "datetime", locale: "both" },
    { name: "status", label: "Statut", type: "select", options: ["draft", "published"], locale: "both" },
    { name: "access_type", label: "Type", type: "select", options: ["free", "premium"], locale: "both" },
    { name: "featured", label: "Mis en avant", type: "boolean", locale: "both" },
  ] },
  formations: { table: "formations", title: "Formations", singular: "formation", titleField: "title", statusField: "status", fields: [
    { name: "publication_locale_status", label: "Publication langue", type: "select", options: ["fr", "en", "both"], locale: "both" },
    { name: "title", label: "Titre", required: true, locale: "fr" },
    { name: "short_description", label: "Description courte", type: "textarea", required: true, locale: "fr" },
    { name: "description", label: "Description complete", type: "richtext", locale: "fr" },
    { name: "objectives", label: "Objectifs", type: "textarea", locale: "fr" },
    { name: "content", label: "Contenu", type: "richtext", locale: "fr" },
    { name: "certificate_label", label: "Certificat", locale: "fr" },
    { name: "title_en", label: "Title", locale: "en" },
    { name: "short_description_en", label: "Short description", type: "textarea", locale: "en" },
    { name: "description_en", label: "Full description", type: "richtext", locale: "en" },
    { name: "objectives_en", label: "Objectives", type: "textarea", locale: "en" },
    { name: "content_en", label: "Content", type: "richtext", locale: "en" },
    { name: "certificate_label_en", label: "Certificate", locale: "en" },
    { name: "image_url", label: "Image", type: "url", locale: "both" },
    { name: "duration", label: "Duree", locale: "both" },
    { name: "level", label: "Niveau", locale: "both" },
    { name: "price", label: "Prix", type: "number", locale: "both" },
    { name: "moodle_url", label: "Lien Moodle", type: "url", locale: "both" },
    { name: "category", label: "Categorie", locale: "fr" },
    { name: "category_en", label: "Category", locale: "en" },
    { name: "status", label: "Statut", type: "select", options: ["draft", "published"], locale: "both" },
    { name: "featured", label: "Mise en avant", type: "boolean", locale: "both" },
  ] },
  teleconseils: { table: "teleconseils", title: "Teleconseils", singular: "pack", titleField: "name", statusField: "status", fields: [
    { name: "name", label: "Nom du pack", required: true, locale: "fr" },
    { name: "description", label: "Description", type: "textarea", required: true, locale: "fr" },
    { name: "name_en", label: "Pack name", locale: "en" },
    { name: "description_en", label: "Description", type: "textarea", locale: "en" },
    { name: "price", label: "Prix", type: "number", locale: "both" },
    { name: "duration", label: "Duree", locale: "both" },
    { name: "target_audience", label: "Public cible", locale: "fr" },
    { name: "target_audience_en", label: "Target audience", locale: "en" },
    { name: "whatsapp_url", label: "Lien WhatsApp", type: "url", locale: "both" },
    { name: "status", label: "Statut", type: "select", options: ["active", "inactive"], locale: "both" },
    { name: "featured", label: "Afficher en accueil", type: "boolean", locale: "both" },
  ] },
  "ressources-premium": { table: "ressources_premium", title: "Ressources premium", singular: "ressource", titleField: "title", statusField: "status", fields: [
    { name: "publication_locale_status", label: "Publication langue", type: "select", options: ["fr", "en", "both"], locale: "both" },
    { name: "title", label: "Titre", required: true, locale: "fr" },
    { name: "description", label: "Description", type: "textarea", required: true, locale: "fr" },
    { name: "title_en", label: "Title", locale: "en" },
    { name: "description_en", label: "Description", type: "textarea", locale: "en" },
    { name: "image_url", label: "Image ou icone", type: "url", locale: "both" },
    { name: "file_url", label: "Fichier PDF ou lien", type: "url", locale: "both" },
    { name: "price", label: "Prix", type: "number", locale: "both" },
    { name: "status", label: "Statut", type: "select", options: ["draft", "published"], locale: "both" },
    { name: "access_type", label: "Acces", type: "select", options: ["free", "paid", "subscribers"], locale: "both" },
    { name: "featured", label: "Mise en avant", type: "boolean", locale: "both" },
  ] },
  temoignages: { table: "temoignages", title: "Temoignages", singular: "temoignage", titleField: "name", statusField: "status", fields: [
    { name: "name", label: "Nom", required: true },
    { name: "role", label: "Fonction" },
    { name: "photo_url", label: "Photo", type: "url" },
    { name: "testimony", label: "Temoignage", type: "textarea", required: true },
    { name: "rating", label: "Note sur 5", type: "number" },
    { name: "status", label: "Statut", type: "select", options: ["visible", "hidden"] },
  ] },
};

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
