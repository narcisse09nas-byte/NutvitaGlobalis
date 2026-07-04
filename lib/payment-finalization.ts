import type { SupabaseClient } from "@supabase/supabase-js";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { sendSystemEmail } from "@/lib/system-email";

function failIfError(context: string, error: { message?: string } | null | undefined) {
  if (error) throw new Error(`${context}: ${error.message || "erreur Supabase"}`);
}

function isMissingBookingEntitlementColumn(error: { code?: string; message?: string } | null | undefined) {
  const message = String(error?.message || "");
  return error?.code === "PGRST204"
    || (message.includes("schema cache") && /access_(starts|expires)_at|renewal_price_xof/.test(message));
}

function includedTrackingBenefits(productName: string) {
  const normalized = productName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("femme enceinte")) return [
    { serviceType: "child_growth", extraMonths: 0 },
    { serviceType: "health_tracking", extraMonths: 1 },
  ];
  if (normalized.includes("diabete") || normalized.includes("perte de poids")) return [{ serviceType: "health_tracking", extraMonths: 0 }];
  if (normalized.includes("nutrition infantile")) return [{ serviceType: "child_growth", extraMonths: 0 }];
  return [];
}

async function activateIncludedPremiumTracking(admin: SupabaseClient, payment: any, start: Date, accessEnd: Date) {
  const benefits = includedTrackingBenefits(`${payment.product_name || ""} ${payment.product_id || ""}`);
  for (const benefit of benefits) {
  const serviceType = benefit.serviceType;
  const benefitEnd = new Date(accessEnd);
  benefitEnd.setUTCMonth(benefitEnd.getUTCMonth() + benefit.extraMonths);

  const { data: plans, error: planError } = await admin
    .from("subscription_plans")
    .select("id,duration_months")
    .eq("service_type", serviceType)
    .eq("tier", "premium")
    .eq("active", true);
  failIfError("Recherche du suivi Premium inclus", planError);
  const plan = (plans || []).sort((a: any, b: any) =>
    Math.abs(Number(a.duration_months || 12) - 3) - Math.abs(Number(b.duration_months || 12) - 3)
  )[0];
  if (!plan) throw new Error(`Aucun plan Premium actif pour ${serviceType}`);

  let childId: string | null = null;
  if (serviceType === "child_growth") {
    const { data: child, error } = await admin.from("children").select("id").eq("parent_id", payment.client_id).eq("active", true).order("created_at").limit(1).maybeSingle();
    failIfError("Recherche de l enfant beneficiaire", error);
    childId = child?.id || null;
  }

  const { data: existing, error: existingError } = await admin
    .from("subscriptions")
    .select("id,expires_at,child_id")
    .eq("client_id", payment.client_id)
    .eq("plan_id", plan.id)
    .eq("purchase_action", "included_pack")
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  failIfError("Lecture du suivi Premium inclus", existingError);

  const previousEnd = existing?.expires_at ? new Date(existing.expires_at) : null;
  const end = previousEnd && +previousEnd > +benefitEnd ? previousEnd : benefitEnd;
  const payload = {
    client_id: payment.client_id,
    child_id: existing?.child_id || childId,
    plan_id: plan.id,
    provider: "manual",
    status: "active",
    started_at: start.toISOString(),
    expires_at: end.toISOString(),
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString(),
    renewal_period_months: 3,
    purchase_action: "included_pack",
  };
  const result = existing
    ? await admin.from("subscriptions").update(payload).eq("id", existing.id)
    : await admin.from("subscriptions").insert(payload);
  failIfError("Activation du suivi Premium inclus", result.error);
  }
}

export async function finalizePayment(admin: SupabaseClient, paymentId: string, providerPaymentId: string, rawEvent: unknown) {
  const { data: payment, error: paymentError } = await admin.from("payments").select("*, subscriptions(*, subscription_plans(*)), client_profiles(*)").eq("id", paymentId).single();
  failIfError("Lecture du paiement", paymentError);
  if (!payment || payment.status === "succeeded") return;

  const client = payment.client_profiles || {};
  const plan = payment.subscriptions?.subscription_plans || {};
  const service = { name: payment.product_name || plan.name || "Service NutVitaGlobalis", duration_months: plan.duration_months };
  const start = new Date();
  let end: Date | null = null;

  if (payment.purchase_type === "subscription") {
    const duration = Math.max(1, Number(plan.duration_months || payment.subscriptions?.renewal_period_months || 12));
    const targetSubscriptionId = payment.subscriptions?.extends_subscription_id || payment.subscription_id;
    let activationStart = start;
    let target: any = null;
    if (payment.subscriptions?.extends_subscription_id) {
      const result = await admin.from("subscriptions").select("expires_at,started_at").eq("id", targetSubscriptionId).single();
      target = result.data;
      const targetError = result.error;
      failIfError("Lecture de l abonnement a etendre", targetError);
      if (!payment.subscriptions?.upgrade_from_subscription_id && target?.expires_at && +new Date(target.expires_at) > +start) activationStart = new Date(target.expires_at);
    }
    end = payment.subscriptions?.upgrade_from_subscription_id && target?.expires_at ? new Date(target.expires_at) : new Date(activationStart);
    if (!payment.subscriptions?.upgrade_from_subscription_id) end.setUTCMonth(end.getUTCMonth() + duration);
    const activated = await admin.from("subscriptions").update({ status: "active", plan_id: payment.subscriptions?.upgrade_from_subscription_id ? payment.subscriptions.plan_id : undefined, started_at: payment.subscriptions?.upgrade_from_subscription_id && target?.started_at ? target.started_at : activationStart.toISOString(), expires_at: end.toISOString(), current_period_start: activationStart.toISOString(), current_period_end: end.toISOString(), renewal_period_months: duration }).eq("id", targetSubscriptionId);
    failIfError(payment.subscriptions?.extends_subscription_id ? "Extension de l abonnement" : "Activation de l abonnement", activated.error);
    if (payment.subscriptions?.extends_subscription_id) {
      failIfError("Cloture de la demande d extension", (await admin.from("subscriptions").update({ status: "cancelled", started_at: start.toISOString(), expires_at: end.toISOString() }).eq("id", payment.subscription_id)).error);
    }
  } else if (payment.purchase_type === "formation") {
    const { data: formation, error: formationError } = await admin.from("formations").select("moodle_url").eq("id", payment.product_id).single();
    failIfError("Lecture de la formation", formationError);
    const enrollment = await admin.from("formation_enrollments").upsert({ client_id: payment.client_id, formation_id: payment.product_id, payment_id: payment.id, status: "active", access_url: formation?.moodle_url || null }, { onConflict: "client_id,formation_id" });
    failIfError("Activation de la formation", enrollment.error);
    const notification = await admin.from("client_notifications").insert({ client_id: payment.client_id, title: "Formation disponible", message: `${payment.product_name} est maintenant accessible depuis votre espace client.`, link_url: "/espace-client" });
    failIfError("Notification formation", notification.error);
  } else if (payment.purchase_type === "consultation") {
    let existingResult=await admin.from('consultation_bookings').select('*').eq('client_id',payment.client_id).eq('teleconseil_id',payment.product_id).order('access_expires_at',{ascending:false}).limit(1).maybeSingle();
    if(isMissingBookingEntitlementColumn(existingResult.error))existingResult=await admin.from('consultation_bookings').select('*').eq('client_id',payment.client_id).eq('teleconseil_id',payment.product_id).order('created_at',{ascending:false}).limit(1).maybeSingle();
    failIfError("Lecture du pack existant",existingResult.error);
    const existing=existingResult.data;
    const accessStart=existing?.access_expires_at&&+new Date(existing.access_expires_at)>+start?new Date(existing.access_expires_at):start;
    const accessEnd=new Date(accessStart);accessEnd.setUTCMonth(accessEnd.getUTCMonth()+3);end=accessEnd;
    let booking:any;
    if(existing){
      const status=['slot_required','scheduled','completed'].includes(existing.status)?existing.status:'slot_required';
      let result=await admin.from('consultation_bookings').update({payment_id:payment.id,status,access_starts_at:existing.access_starts_at||start.toISOString(),access_expires_at:accessEnd.toISOString(),renewal_price_xof:Number(payment.source_amount_xof||payment.price_excluding_tax||0)}).eq('id',existing.id).select().single();
      if(isMissingBookingEntitlementColumn(result.error))result=await admin.from('consultation_bookings').update({payment_id:payment.id,status}).eq('id',existing.id).select().single();
      failIfError("Renouvellement du pack",result.error);booking=result.data;
    }else{
      const base={client_id:payment.client_id,teleconseil_id:payment.product_id,payment_id:payment.id,status:'slot_required'};
      let result=await admin.from('consultation_bookings').insert({...base,access_starts_at:start.toISOString(),access_expires_at:accessEnd.toISOString(),renewal_price_xof:Number(payment.source_amount_xof||payment.price_excluding_tax||0)}).select().single();
      if(isMissingBookingEntitlementColumn(result.error))result=await admin.from('consultation_bookings').insert(base).select().single();
      failIfError("Activation du pack",result.error);booking=result.data;
    }
    await activateIncludedPremiumTracking(admin, payment, start, accessEnd);
    if(booking&&!existing){const {data:conversation}=await admin.from('collaboration_conversations').insert({title:`Suivi expert - ${payment.product_name}`,conversation_type:'consultation',consultation_id:booking.id,created_by:payment.client_id}).select().single();if(conversation)await admin.from('collaboration_members').insert({conversation_id:conversation.id,user_id:payment.client_id,member_role:'client'});await admin.from("consultation_waiting_room").insert({client_id:payment.client_id,teleconseil_id:payment.product_id,payment_id:payment.id,reason:payment.product_name,status:"waiting",country:client.country||null,city:client.city||null,ai_recommendation:{signals:["Nouveau paiement confirme","Client en attente d attribution"],score:50}})}
    await admin.from("client_notifications").insert({ client_id: payment.client_id, title: existing?"Pack téléconseil renouvelé":"Consultation à planifier", message: `Votre accès est actif jusqu’au ${accessEnd.toLocaleDateString('fr-FR')}. Chat et appels vidéo avec votre expert inclus.`, link_url: "/espace-client/messages" });
  }

  failIfError("Validation du paiement", (await admin.from("payments").update({ status: "succeeded", provider_payment_id: providerPaymentId, paid_at: start.toISOString(), raw_event: rawEvent }).eq("id", payment.id)).error);

  let invoice: any = null;
  try {
    const { data: createdInvoice, error } = await admin.from("invoices").insert({ invoice_number: `NVG-${start.getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, client_id: payment.client_id, payment_id: payment.id, subscription_id: payment.subscription_id || null, product_name: service.name, purchase_type: payment.purchase_type, payment_provider: payment.provider, payment_status: "paid", client_name: client.full_name || client.email, client_email: client.email, price_excluding_tax: payment.price_excluding_tax, tax_rate: payment.tax_rate, tax_amount: payment.tax_amount, total_including_tax: payment.total_including_tax, currency: payment.currency }).select().single();
    failIfError("Creation de la facture", error);
    invoice = createdInvoice;
    const bytes = await renderInvoicePdf(invoice, client, service);
    const path = `${payment.client_id}/invoices/${invoice.id}.pdf`;
    const upload = await admin.storage.from("document-vault").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    failIfError("Upload de la facture", upload.error);
    failIfError("Mise a jour de la facture", (await admin.from("invoices").update({ file_path: path }).eq("id", invoice.id)).error);
    failIfError("Lien facture-paiement", (await admin.from("payments").update({ invoice_id: invoice.id }).eq("id", payment.id)).error);
    failIfError("Archivage de la facture", (await admin.from("vault_documents").insert({ owner_id: payment.client_id, client_id: payment.client_id, document_type: "invoice", title: `Facture ${invoice.invoice_number}`, file_path: path, mime_type: "application/pdf", confidential: true, created_by: payment.client_id })).error);
  } catch (error) {
    console.error("Invoice finalization failed", error);
  }

  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||"";
  try {
    await sendSystemEmail(admin, "payment_confirmed", client.email, { name: client.full_name || "Client", product: service.name, total: Number(payment.total_including_tax).toLocaleString("fr-FR"), currency: payment.currency, start_date: start.toLocaleDateString("fr-FR"), end_date: end?.toLocaleDateString("fr-FR") || "service confirme", action_url:`${siteUrl}/espace-client` }, { payment_id: payment.id, invoice_id: invoice?.id });
    if(invoice)await sendSystemEmail(admin,"invoice_available",client.email,{name:client.full_name||"Client",invoice_number:invoice.invoice_number,action_url:`${siteUrl}/espace-client`},{payment_id:payment.id,invoice_id:invoice.id});
    if(payment.purchase_type==="subscription")await sendSystemEmail(admin,"subscription_confirmed",client.email,{name:client.full_name||"Client",product:service.name,end_date:end?.toLocaleDateString("fr-FR")||"",action_url:`${siteUrl}/espace-client`},{payment_id:payment.id});
    if (payment.purchase_type === "formation") {await sendSystemEmail(admin, "formation_purchased", client.email, { name: client.full_name || "Client", product: payment.product_name,action_url:`${siteUrl}/espace-client` }, { payment_id: payment.id });await sendSystemEmail(admin,"course_access_activated",client.email,{name:client.full_name||"Client",product:payment.product_name,action_url:`${siteUrl}/espace-client`},{payment_id:payment.id});}
    if (payment.purchase_type === "consultation") {
      await sendSystemEmail(admin, "consultation_booked", client.email, { name: client.full_name || "Client", product: payment.product_name,action_url:`${siteUrl}/espace-client` }, { payment_id: payment.id });
      const teamEmail = process.env.CONTACT_TO_EMAIL || "contact@nutvitaglobalis.com";
      await sendSystemEmail(admin, "consultation_booked_admin", teamEmail, { name: client.full_name || client.email, product: payment.product_name }, { payment_id: payment.id, client_id: payment.client_id });
    }
    await sendSystemEmail(admin,"admin_purchase_notification",process.env.CONTACT_TO_EMAIL||"contact@nutvitaglobalis.com",{name:client.full_name||client.email,product:service.name,total:Number(payment.total_including_tax).toLocaleString("fr-FR"),currency:payment.currency,action_url:`${siteUrl}/admin/paiements`},{payment_id:payment.id});
  } catch (error) {
    console.error("Payment notification failed", error);
  }
}
