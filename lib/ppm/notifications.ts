// Refinement program, Wave 1: one shared call site for "tell someone they must act" across every
// PPM workflow (submit/verify/approve steps, register reviews, external approvals...) instead of
// each register hand-rolling its own notification insert. Emits both an in-app ppm_notifications
// row and, when an email template is supplied, a real email via the existing sendSystemEmail/resend
// pipeline (lib/system-email.ts) — reusing admin_users.preferred_language (multilingual-fr-en.sql)
// so each recipient gets their own language rather than a single hardcoded locale.
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import { sendSystemEmail } from "@/lib/system-email";
import type { NotificationCategory } from "@/lib/ppm/types";

export type PpmNotificationRecipient = {
  userId?: string | null;
  email?: string | null;
};

export type NotifyPpmEventInput = {
  recipient: PpmNotificationRecipient;
  projectId?: string | null;
  category?: NotificationCategory;
  titleFr: string;
  titleEn: string;
  messageFr?: string;
  messageEn?: string;
  link?: string;
  emailTemplateId?: string;
  emailVariables?: Record<string, string>;
};

async function resolveRecipientLocale(supabase: SupabaseClient, recipient: PpmNotificationRecipient): Promise<Locale> {
  if (!recipient.userId && !recipient.email) return "fr";
  const query = supabase.from("admin_users").select("preferred_language");
  const { data } = recipient.userId
    ? await query.eq("id", recipient.userId).maybeSingle()
    : await query.eq("email", (recipient.email || "").toLowerCase()).maybeSingle();
  return normalizeLocale(data?.preferred_language);
}

export async function notifyPpmEvent(supabase: SupabaseClient, input: NotifyPpmEventInput) {
  if (!input.recipient.userId && !input.recipient.email) return;
  const locale = await resolveRecipientLocale(supabase, input.recipient);
  const title = locale === "en" ? input.titleEn : input.titleFr;
  const message = locale === "en" ? input.messageEn : input.messageFr;

  await supabase.from("ppm_notifications").insert({
    user_id: input.recipient.userId || null,
    recipient_email: input.recipient.email || null,
    project_id: input.projectId || null,
    category: input.category || "info",
    title,
    message: message || null,
    link: input.link || null,
  });

  if (input.emailTemplateId && input.recipient.email) {
    await sendSystemEmail(
      supabase,
      input.emailTemplateId,
      input.recipient.email,
      { ...input.emailVariables, locale, action_url: input.link || input.emailVariables?.action_url || "" },
      { project_id: input.projectId || undefined, locale },
    );
  }
}
