import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLocale } from "@/lib/i18n";
import { resend } from "@/lib/api";

function emailHtml(subject: string, text: string, actionUrl?: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#143d31"><h1>${subject}</h1><p>${text.replace(/\n/g, "<br/>")}</p>${actionUrl ? `<p><a href="${actionUrl}" style="background:#0f5132;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Ouvrir</a></p>` : ""}</div>`;
}

export async function sendSystemEmail(supabase: SupabaseClient, templateId: string, recipient: string, variables: Record<string, string>, metadata: Record<string, unknown> = {}) {
  const locale = normalizeLocale(String(metadata.locale || variables.locale || "fr"));
  const { data: template } = await supabase.from("system_email_templates").select("*").eq("id", templateId).eq("active", true).maybeSingle();
  if (!template) return;
  const { data: translation } = await supabase.from("email_templates_translations").select("*").eq("template_id", templateId).eq("locale", locale).maybeSingle();
  const replace = (value: string) => Object.entries(variables).reduce((result, [key, replacement]) => result.replaceAll(`{{${key}}}`, replacement || ""), value);
  const subject = replace(translation?.subject || template[`subject_${locale}`] || template.subject);
  const text = replace(translation?.body_text || template[`body_text_${locale}`] || template.body_text);
  const actionUrl = variables.action_url;
  const { data: log } = await supabase.from("system_email_logs").insert({ template_id: templateId, recipient, subject, status: "queued", metadata: { ...metadata, locale } }).select("id").single();
  try {
    const response = await resend("/emails", { from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>", to: [recipient], subject, text, html: emailHtml(subject, text, actionUrl) });
    const result = await response.json();
    await supabase.from("system_email_logs").update({ status: "sent", provider_id: result.id || null, sent_at: new Date().toISOString() }).eq("id", log?.id);
  } catch (error) {
    await supabase.from("system_email_logs").update({ status: "failed", error_message: error instanceof Error ? error.message : "Envoi impossible" }).eq("id", log?.id);
  }
}
