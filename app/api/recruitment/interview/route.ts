import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/api";

async function adminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.from("admin_users").select("id").eq("id", user.id).eq("active", true).maybeSingle();
  return admin ? { supabase, user } : null;
}

function emailList(value: unknown) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const auth = await adminClient();
  if (!auth) return NextResponse.json({ message: "Acces refuse." }, { status: 403 });
  const { supabase, user } = auth;
  const body = await request.json();
  const { data: app } = await supabase.from("recruitment_applications").select("*").eq("id", body.application_id).single();
  if (!app) return NextResponse.json({ message: "Candidature introuvable." }, { status: 404 });

  const provider = ["jitsi", "external", "physical"].includes(body.provider) ? body.provider : "external";
  const roomName = body.room_name || `NutVita-${app.id.slice(0, 8)}-${crypto.randomUUID().slice(0, 8)}`;
  const meetingUrl = provider === "jitsi"
    ? `https://${process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si"}/${roomName}`
    : String(body.meeting_url || "").trim();
  if (provider === "external" && !meetingUrl.startsWith("https://")) {
    return NextResponse.json({ message: "Un lien HTTPS valide est requis." }, { status: 400 });
  }
  if (provider === "physical" && !meetingUrl) {
    return NextResponse.json({ message: "Le lieu de l'entretien est requis." }, { status: 400 });
  }
  const { data: interview, error } = await supabase.from("video_interviews").insert({
    application_id: app.id,
    candidate_id: app.candidate_id,
    scheduled_at: body.scheduled_at,
    duration_minutes: Number(body.duration_minutes || 45),
    provider,
    room_name: roomName,
    meeting_url: meetingUrl,
    status: "scheduled",
    admin_notes: body.admin_notes || null,
    created_by: user.id,
  }).select("*, recruitment_applications(full_name,email), interview_evaluations(*)").single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  const juryEmails = emailList(body.jury_emails);
  const participantEmails = emailList(body.participant_emails);
  const invited = Array.from(new Set([app.email, ...juryEmails, ...participantEmails].filter(Boolean)));

  try {
    const panelRows = [
      { email: app.email, role: "candidate", full_name: app.full_name },
      ...juryEmails.map(email => ({ email, role: "jury", full_name: null })),
      ...participantEmails.map(email => ({ email, role: "observer", full_name: null })),
    ].map(item => ({ interview_id: interview.id, email: item.email, role: item.role, full_name: item.full_name, invited_by: user.id }));
    const { data: panel } = await supabase.from("interview_panel_members").upsert(panelRows, { onConflict: "interview_id,email" }).select("*");
    const panelByEmail = new Map((panel || []).map((member: any) => [String(member.email).toLowerCase(), member.id]));
    const questions = Array.isArray(body.questions) ? body.questions : [];
    const questionRows = questions
      .map((question: any, index: number) => ({
        interview_id: interview.id,
        prompt: String(question.prompt || "").trim(),
        assigned_member_id: question.assigned_email ? panelByEmail.get(String(question.assigned_email).toLowerCase()) || null : null,
        position: index + 1,
        private_notes: question.private_notes || null,
      }))
      .filter((question: any) => question.prompt);
    if (questionRows.length) await supabase.from("interview_questions").insert(questionRows);
    await supabase.from("interview_session_logs").insert({
      interview_id: interview.id,
      event_type: "scheduled",
      actor_email: user.email,
      details: { jury_emails: juryEmails, participant_emails: participantEmails, question_count: questionRows.length, meeting_url: meetingUrl },
    });
  } catch (panelError) {
    console.error("Interview panel setup", panelError);
  }

  await supabase.from("recruitment_applications").update({ status: "invited_to_interview" }).eq("id", app.id);
  const accessLabel = provider === "physical" ? "Lieu" : "Lien";
  await supabase.from("recruitment_history").insert({ application_id: app.id, actor_id: user.id, action: "Entretien planifie", from_status: app.status, to_status: "invited_to_interview", note: `${accessLabel}: ${meetingUrl}` });
  await supabase.from("recruitment_notifications").insert({ candidate_id: app.candidate_id, title: "Entretien planifie", message: `Votre entretien est prevu le ${new Date(body.scheduled_at).toLocaleString("fr-FR")}. ${accessLabel}: ${meetingUrl}` });

  await Promise.allSettled(invited.map(email => resend("/emails", {
    from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
    to: [email],
    subject: "Invitation a un entretien NutVitaGlobalis",
    text: `Bonjour,\n\nUn entretien NutVitaGlobalis est planifie le ${new Date(body.scheduled_at).toLocaleString("fr-FR")}.\n${accessLabel}: ${meetingUrl}\n\nLes questions d'entretien sont visibles uniquement aux administrateurs et aux membres du jury connectes.\n\nEquipe NutVitaGlobalis`,
  })));

  return NextResponse.json({ ok: true, interview });
}

export async function PUT(request: Request) {
  const auth = await adminClient();
  if (!auth) return NextResponse.json({ message: "Acces refuse." }, { status: 403 });
  const { supabase, user } = auth;
  const body = await request.json();
  const { data: interview } = await supabase.from("video_interviews").select("application_id").eq("id", body.interview_id).single();
  if (!interview) return NextResponse.json({ message: "Entretien introuvable." }, { status: 404 });
  const { error } = await supabase.from("interview_evaluations").upsert({
    interview_id: body.interview_id,
    technical_skill: body.technical_skill,
    communication: body.communication,
    professional_ethics: body.professional_ethics,
    clinical_experience: body.clinical_experience,
    teleconsultation_aptitude: body.teleconsultation_aptitude,
    availability: body.availability,
    motivation: body.motivation,
    notes: body.notes || null,
    recommendation: body.recommendation || "pending",
    evaluator_id: user.id,
  }, { onConflict: "interview_id" });
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  await supabase.from("video_interviews").update({ status: body.complete ? "completed" : "in_progress", admin_notes: body.admin_notes || null }).eq("id", body.interview_id);
  await supabase.from("interview_session_logs").insert({ interview_id: body.interview_id, event_type: body.complete ? "completed" : "evaluation_saved", actor_email: user.email, details: { recommendation: body.recommendation || "pending" } });
  if (body.complete) {
    await supabase.from("recruitment_applications").update({ status: "interview_completed" }).eq("id", interview.application_id);
    await supabase.from("recruitment_history").insert({ application_id: interview.application_id, actor_id: user.id, action: "Entretien termine", from_status: "invited_to_interview", to_status: "interview_completed" });
  }
  return NextResponse.json({ ok: true });
}
