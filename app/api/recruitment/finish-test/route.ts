import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resend } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

    const body = await request.json();
    const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
    const expired = Boolean(body.expired);
    const admin = createAdminClient();

    const { data: app, error: appError } = await admin
      .from("recruitment_applications")
      .select("id,candidate_id,full_name,email,status")
      .eq("candidate_id", user.id)
      .maybeSingle();
    if (appError) return NextResponse.json({ message: appError.message }, { status: 500 });
    if (!app || app.status !== "invited_to_test") {
      return NextResponse.json({ message: "Aucun test actif a soumettre." }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await admin
      .from("recruitment_test_attempts")
      .select("*")
      .eq("application_id", app.id)
      .eq("candidate_id", user.id)
      .maybeSingle();
    if (attemptError) return NextResponse.json({ message: attemptError.message }, { status: 500 });
    if (!attempt || attempt.status !== "in_progress") {
      return NextResponse.json({ message: "Ce test est deja termine ou indisponible." }, { status: 400 });
    }

    const { data: questions, error: questionsError } = await admin
      .from("recruitment_test_questions")
      .select("id,question_type,correct_answer,points,active")
      .eq("active", true);
    if (questionsError) return NextResponse.json({ message: questionsError.message }, { status: 500 });

    const qcm = (questions || []).filter((q: any) => q.question_type === "qcm");
    const total = qcm.reduce((sum: number, q: any) => sum + Number(q.points || 0), 0);
    const earned = qcm.reduce((sum: number, q: any) => {
      return String(answers[q.id] ?? "") === String(q.correct_answer ?? "") ? sum + Number(q.points || 0) : sum;
    }, 0);
    const score = total > 0 ? Math.round((earned / total) * 10000) / 100 : 0;
    const now = new Date().toISOString();

    const { error: updateAttemptError } = await admin
      .from("recruitment_test_attempts")
      .update({
        answers,
        automatic_score: score,
        submitted_at: now,
        status: expired ? "expired" : "submitted",
      })
      .eq("id", attempt.id)
      .eq("status", "in_progress");
    if (updateAttemptError) return NextResponse.json({ message: updateAttemptError.message }, { status: 500 });

    const { error: updateAppError } = await admin
      .from("recruitment_applications")
      .update({ status: "test_completed" })
      .eq("id", app.id);
    if (updateAppError) return NextResponse.json({ message: updateAppError.message }, { status: 500 });

    await admin.from("recruitment_history").insert({
      application_id: app.id,
      actor_id: user.id,
      action: "Test ecrit termine",
      from_status: app.status,
      to_status: "test_completed",
    });
    await admin.from("recruitment_notifications").insert({
      candidate_id: user.id,
      title: "Test ecrit termine",
      message: "Votre test est enregistre. La partie ouverte sera corrigee manuellement avant la prochaine decision.",
    });

    try {
      await resend("/emails", {
        from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
        to: [user.email!],
        subject: "Votre test ecrit NutVitaGlobalis est termine",
        text: `Bonjour ${app.full_name || "Candidat"},\n\nVotre test ecrit a bien ete enregistre. Les QCM ont ete notes automatiquement et les reponses ouvertes seront examinees par notre equipe.\n\nEquipe NutVitaGlobalis`,
      });
    } catch (error) {
      console.error("Test completion email", error);
    }

    return NextResponse.json({ ok: true, score });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Soumission impossible." }, { status: 500 });
  }
}
