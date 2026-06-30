import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmail, resend } from "@/lib/api";

type Scope = "nutvita" | "maximus" | "recruitment_nutritionist" | "recruitment_staff" | "vendor";
const scopes: Scope[] = ["nutvita", "maximus", "recruitment_nutritionist", "recruitment_staff", "vendor"];

async function communicationContext(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Authentification requise." }, { status: 401 }) };
  const scopeValue = new URL(request.url).searchParams.get("scope") || "maximus";
  const scope = scopes.includes(scopeValue as Scope) ? scopeValue as Scope : "maximus";
  const { data: admin } = await supabase.from("admin_users").select("role,active,full_name,email").eq("id", user.id).maybeSingle();
  if (!admin?.active) return { error: NextResponse.json({ message: "Acces communication refuse." }, { status: 403 }) };
  if (scope === "maximus" && admin.role !== "super_admin") return { error: NextResponse.json({ message: "Acces Maximus requis." }, { status: 403 }) };
  return { supabase, service: createAdminClient(), user, admin, scope };
}

export async function GET(request: Request) {
  const ctx = await communicationContext(request);
  if ("error" in ctx) return ctx.error;
  const conversationId = new URL(request.url).searchParams.get("conversation_id");
  if (conversationId) {
    const { data: membership } = await ctx.service.from("collaboration_members").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", ctx.user.id).maybeSingle();
    if (!membership) return NextResponse.json({ message: "Conversation inaccessible." }, { status: 403 });
    const [{ data: messages }, { data: members }] = await Promise.all([
      ctx.service.from("collaboration_messages").select("*").eq("conversation_id", conversationId).order("created_at"),
      ctx.service.from("collaboration_members").select("*").eq("conversation_id", conversationId),
    ]);
    await ctx.service.from("collaboration_members").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", ctx.user.id);
    return NextResponse.json({ messages: messages || [], members: members || [] });
  }

  const { data: memberships } = await ctx.service.from("collaboration_members").select("conversation_id,last_read_at").eq("user_id", ctx.user.id);
  const ids = (memberships || []).map(item => item.conversation_id);
  const conversations = ids.length
    ? await ctx.service.from("collaboration_conversations").select("*,collaboration_members(*)").in("id", ids).eq("workspace_scope", ctx.scope).is("archived_at", null).order("updated_at", { ascending: false })
    : { data: [] };
  const { data: authUsers } = await ctx.service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const { data: staff } = await ctx.service.from("staff_profiles").select("id,full_name,email,department,job_title,status").eq("status", "active");
  const { data: partners } = await ctx.service.from("dietitian_profiles").select("candidate_id,full_name,status").in("status", ["active", "validated"]);
  const staffMap = new Map((staff || []).map(item => [item.id, item]));
  const partnerMap = new Map((partners || []).map(item => [item.candidate_id, item]));
  const contacts = (authUsers?.users || []).filter(item => item.id !== ctx.user.id).map(item => {
    const staffProfile = staffMap.get(item.id);
    const partner = partnerMap.get(item.id);
    return {
      id: item.id,
      email: item.email,
      full_name: staffProfile?.full_name || partner?.full_name || item.user_metadata?.full_name || item.email || "Utilisateur",
      category: staffProfile ? "Personnel" : partner ? "Nutritionniste" : item.user_metadata?.account_type === "staff_candidate" ? "Candidat Staff" : item.user_metadata?.account_type || "Utilisateur",
      detail: staffProfile?.job_title || staffProfile?.department || partner?.status || "",
    };
  });
  return NextResponse.json({
    current_user: { id: ctx.user.id, email: ctx.user.email, full_name: ctx.admin.full_name || ctx.user.user_metadata?.full_name || ctx.user.email },
    conversations: conversations.data || [],
    contacts,
  });
}

export async function POST(request: Request) {
  const ctx = await communicationContext(request);
  if ("error" in ctx) return ctx.error;
  const body = await request.json();
  const action = String(body.action || "");

  if (action === "create_conversation") {
    const recipientIds = Array.from(new Set((Array.isArray(body.recipient_ids) ? body.recipient_ids : []).map(String).filter(Boolean))) as string[];
    if (!recipientIds.length) return NextResponse.json({ message: "Selectionnez au moins un destinataire." }, { status: 400 });
    const title = String(body.title || "").trim() || "Nouvelle conversation";
    const { data: conversation, error } = await ctx.service.from("collaboration_conversations").insert({
      title,
      conversation_type: recipientIds.length > 1 ? "team" : "direct",
      workspace_scope: ctx.scope,
      priority: ["low", "normal", "high", "urgent"].includes(body.priority) ? body.priority : "normal",
      created_by: ctx.user.id,
    }).select("*").single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    const members = [ctx.user.id, ...recipientIds].map(userId => ({ conversation_id: conversation.id, user_id: userId, member_role: userId === ctx.user.id ? "owner" : "member" }));
    const memberResult = await ctx.service.from("collaboration_members").insert(members);
    if (memberResult.error) return NextResponse.json({ message: memberResult.error.message }, { status: 400 });
    if (String(body.message || "").trim()) {
      await ctx.service.from("collaboration_messages").insert({ conversation_id: conversation.id, sender_id: ctx.user.id, body: String(body.message).trim() });
    }
    return NextResponse.json({ conversation: { ...conversation, collaboration_members: members } });
  }

  if (action === "send_message") {
    const conversationId = String(body.conversation_id || "");
    const { data: membership } = await ctx.service.from("collaboration_members").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", ctx.user.id).maybeSingle();
    if (!membership) return NextResponse.json({ message: "Conversation inaccessible." }, { status: 403 });
    if (!String(body.message || "").trim() && !body.attachment_path) return NextResponse.json({ message: "Message vide." }, { status: 400 });
    const { data, error } = await ctx.service.from("collaboration_messages").insert({
      conversation_id: conversationId,
      sender_id: ctx.user.id,
      body: String(body.message || "").trim() || null,
      attachment_path: body.attachment_path || null,
      attachment_name: body.attachment_name || null,
      parent_message_id: body.parent_message_id || null,
    }).select("*").single();
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
    await ctx.service.from("collaboration_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return NextResponse.json({ message: data });
  }

  if (action === "send_email") {
    const recipients = Array.from(new Set((Array.isArray(body.recipients) ? body.recipients : []).map((value: unknown) => String(value).trim().toLowerCase()).filter(Boolean))) as string[];
    if (!recipients.length || recipients.some(email => !isEmail(email))) return NextResponse.json({ message: "Destinataires email invalides." }, { status: 400 });
    const subject = String(body.subject || "").trim();
    const text = String(body.message || "").trim();
    if (!subject || !text) return NextResponse.json({ message: "Sujet et message requis." }, { status: 400 });
    const { data: dispatch } = await ctx.service.from("collaboration_email_dispatches").insert({
      workspace_scope: ctx.scope,
      sender_id: ctx.user.id,
      sender_email: ctx.user.email || ctx.admin.email,
      recipients,
      subject,
      body_text: text,
      attachment_path: body.attachment_path || null,
      attachment_name: body.attachment_name || null,
      related_type: body.related_type || null,
      related_id: body.related_id || null,
    }).select("*").single();
    try {
      let attachments: { filename: string; content: string }[] | undefined;
      if (body.attachment_path) {
        const file = await ctx.service.storage.from("collaboration-files").download(body.attachment_path);
        if (file.error) throw file.error;
        attachments = [{ filename: body.attachment_name || "document", content: Buffer.from(await file.data.arrayBuffer()).toString("base64") }];
      }
      const response = await resend("/emails", {
        from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
        reply_to: ctx.user.email,
        to: recipients,
        subject,
        text,
        attachments,
      });
      const provider = await response.json().catch(() => ({}));
      await ctx.service.from("collaboration_email_dispatches").update({ status: "sent", provider_message_id: provider.id || null, sent_at: new Date().toISOString() }).eq("id", dispatch.id);
      return NextResponse.json({ ok: true, dispatch_id: dispatch.id });
    } catch (error) {
      await ctx.service.from("collaboration_email_dispatches").update({ status: "failed", error_message: error instanceof Error ? error.message : "Echec Resend" }).eq("id", dispatch.id);
      return NextResponse.json({ message: error instanceof Error && error.message === "RESEND_NOT_CONFIGURED" ? "RESEND_API_KEY n est pas configuree sur cet environnement." : "L email n a pas pu etre envoye." }, { status: 503 });
    }
  }
  return NextResponse.json({ message: "Action inconnue." }, { status: 400 });
}
