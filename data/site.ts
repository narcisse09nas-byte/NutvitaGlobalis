const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "";

export const siteConfig = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@nutvitaglobalis.com",
  whatsappNumber,
  whatsappLabel: process.env.NEXT_PUBLIC_WHATSAPP_LABEL ?? "WhatsApp",
  address: process.env.NEXT_PUBLIC_ADDRESS ?? "Douala, Cameroun",
};

export function whatsappUrl(message = "Bonjour NutVitaGlobalis, je souhaite obtenir des informations.") {
  if (!whatsappNumber) return `https://wa.me/?text=${encodeURIComponent(`${message}\n\nContact: ${siteConfig.email}`)}`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
