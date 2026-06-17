import type { SupabaseClient } from "@supabase/supabase-js";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { sendSystemEmail } from "@/lib/system-email";

export async function finalizePayment(admin: SupabaseClient, paymentId: string, providerPaymentId: string, rawEvent: unknown) {
  const { data: payment } = await admin.from("payments").select("*, subscriptions(*, subscription_plans(*)), client_profiles(*)").eq("id", paymentId).single();
  if (!payment || payment.status === "succeeded") return;

  const client = payment.client_profiles || {};
  const plan = payment.subscriptions?.subscription_plans || {};
  const service = { name: payment.product_name || plan.name || "Service NutVitaGlobalis", duration_months: plan.duration_months };
  const start = new Date();
  let end: Date | null = null;

  if (payment.purchase_type === "subscription") {
    const duration = Math.max(1, Number(plan.duration_months || payment.subscriptions?.renewal_period_months || 12));
    end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + duration);
    await admin.from("subscriptions").update({ status: "active", started_at: start.toISOString(), expires_at: end.toISOString(), current_period_start: start.toISOString(), current_period_end: end.toISOString(), renewal_period_months: duration }).eq("id", payment.subscription_id);
  } else if (payment.purchase_type === "formation") {
    const { data: formation } = await admin.from("formations").select("moodle_url").eq("id", payment.product_id).single();
    await admin.from("formation_enrollments").upsert({ client_id: payment.client_id, formation_id: payment.product_id, payment_id: payment.id, status: "active", access_url: formation?.moodle_url || null }, { onConflict: "client_id,formation_id" });
    await admin.from("client_notifications").insert({ client_id: payment.client_id, title: "Formation disponible", message: `${payment.product_name} est maintenant accessible depuis votre espace client.`, link_url: "/espace-client" });
  } else if (payment.purchase_type === "consultation") {
    const {data:existing}=await admin.from('consultation_bookings').select('*').eq('client_id',payment.client_id).eq('teleconseil_id',payment.product_id).order('access_expires_at',{ascending:false}).limit(1).maybeSingle();
    const accessStart=existing?.access_expires_at&&+new Date(existing.access_expires_at)>+start?new Date(existing.access_expires_at):start;
    const accessEnd=new Date(accessStart);accessEnd.setUTCMonth(accessEnd.getUTCMonth()+12);end=accessEnd;
    let booking:any;
    if(existing){const result=await admin.from('consultation_bookings').update({payment_id:payment.id,status:'confirmed',access_starts_at:existing.access_starts_at||start.toISOString(),access_expires_at:accessEnd.toISOString(),renewal_price_xof:Number(payment.source_amount_xof||payment.price_excluding_tax||0)}).eq('id',existing.id).select().single();booking=result.data}
    else{const result=await admin.from('consultation_bookings').insert({client_id:payment.client_id,teleconseil_id:payment.product_id,payment_id:payment.id,status:'slot_required',access_starts_at:start.toISOString(),access_expires_at:accessEnd.toISOString(),renewal_price_xof:Number(payment.source_amount_xof||payment.price_excluding_tax||0)}).select().single();booking=result.data}
    if(booking&&!existing){const {data:conversation}=await admin.from('collaboration_conversations').insert({title:`Suivi expert - ${payment.product_name}`,conversation_type:'consultation',consultation_id:booking.id,created_by:payment.client_id}).select().single();if(conversation)await admin.from('collaboration_members').insert({conversation_id:conversation.id,user_id:payment.client_id,member_role:'client'});await admin.from("consultation_waiting_room").insert({client_id:payment.client_id,teleconseil_id:payment.product_id,payment_id:payment.id,reason:payment.product_name,status:"waiting",country:client.country||null,city:client.city||null,ai_recommendation:{signals:["Nouveau paiement confirme","Client en attente d attribution"],score:50}})}
    await admin.from("client_notifications").insert({ client_id: payment.client_id, title: existing?"Pack téléconseil renouvelé":"Consultation à planifier", message: `Votre accès est actif jusqu’au ${accessEnd.toLocaleDateString('fr-FR')}. Chat et appels vidéo avec votre expert inclus.`, link_url: "/espace-client/messages" });
  }

  const { data: invoice, error } = await admin.from("invoices").insert({ invoice_number: `NVG-${start.getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, client_id: payment.client_id, payment_id: payment.id, subscription_id: payment.subscription_id || null, product_name: service.name, purchase_type: payment.purchase_type, payment_provider: payment.provider, payment_status: "paid", client_name: client.full_name || client.email, client_email: client.email, price_excluding_tax: payment.price_excluding_tax, tax_rate: payment.tax_rate, tax_amount: payment.tax_amount, total_including_tax: payment.total_including_tax, currency: payment.currency }).select().single();
  if (error) throw error;
  const bytes = await renderInvoicePdf(invoice, client, service);
  const path = `${payment.client_id}/invoices/${invoice.id}.pdf`;
  const upload = await admin.storage.from("document-vault").upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (upload.error) throw upload.error;
  await admin.from("invoices").update({ file_path: path }).eq("id", invoice.id);
  await admin.from("payments").update({ status: "succeeded", provider_payment_id: providerPaymentId, paid_at: start.toISOString(), raw_event: rawEvent, invoice_id: invoice.id }).eq("id", payment.id);
  await admin.from("vault_documents").insert({ owner_id: payment.client_id, client_id: payment.client_id, document_type: "invoice", title: `Facture ${invoice.invoice_number}`, file_path: path, mime_type: "application/pdf", confidential: true, created_by: payment.client_id });

  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||"";
  await sendSystemEmail(admin, "payment_confirmed", client.email, { name: client.full_name || "Client", product: service.name, total: Number(payment.total_including_tax).toLocaleString("fr-FR"), currency: payment.currency, start_date: start.toLocaleDateString("fr-FR"), end_date: end?.toLocaleDateString("fr-FR") || "service confirme", action_url:`${siteUrl}/espace-client` }, { payment_id: payment.id, invoice_id: invoice.id });
  await sendSystemEmail(admin,"invoice_available",client.email,{name:client.full_name||"Client",invoice_number:invoice.invoice_number,action_url:`${siteUrl}/espace-client`},{payment_id:payment.id,invoice_id:invoice.id});
  if(payment.purchase_type==="subscription")await sendSystemEmail(admin,"subscription_confirmed",client.email,{name:client.full_name||"Client",product:service.name,end_date:end?.toLocaleDateString("fr-FR")||"",action_url:`${siteUrl}/espace-client`},{payment_id:payment.id});
  if (payment.purchase_type === "formation") {await sendSystemEmail(admin, "formation_purchased", client.email, { name: client.full_name || "Client", product: payment.product_name,action_url:`${siteUrl}/espace-client` }, { payment_id: payment.id });await sendSystemEmail(admin,"course_access_activated",client.email,{name:client.full_name||"Client",product:payment.product_name,action_url:`${siteUrl}/espace-client`},{payment_id:payment.id});}
  if (payment.purchase_type === "consultation") {
    await sendSystemEmail(admin, "consultation_booked", client.email, { name: client.full_name || "Client", product: payment.product_name,action_url:`${siteUrl}/espace-client` }, { payment_id: payment.id });
    const teamEmail = process.env.CONTACT_TO_EMAIL || "contact@nutvitaglobalis.com";
    await sendSystemEmail(admin, "consultation_booked_admin", teamEmail, { name: client.full_name || client.email, product: payment.product_name }, { payment_id: payment.id, client_id: payment.client_id });
  }
  await sendSystemEmail(admin,"admin_purchase_notification",process.env.CONTACT_TO_EMAIL||"contact@nutvitaglobalis.com",{name:client.full_name||client.email,product:service.name,total:Number(payment.total_including_tax).toLocaleString("fr-FR"),currency:payment.currency,action_url:`${siteUrl}/admin/paiements`},{payment_id:payment.id});
}
