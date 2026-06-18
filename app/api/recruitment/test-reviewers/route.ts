import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin();
    const body = await request.json();
    const admin = createAdminClient();
    const emails = String(body.emails || "")
      .split(/[\n,;]+/)
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) return NextResponse.json({ message: "Ajoutez au moins une adresse email." }, { status: 400 });

    const { data: attempt, error } = await admin
      .from("recruitment_test_attempts")
      .select("id,application_id,recruitment_applications(full_name,email)")
      .eq("id", String(body.attempt_id))
      .single();
    if (error || !attempt) return NextResponse.json({ message: error?.message || "Test introuvable." }, { status: 404 });

    const { data: users } = await admin.auth.admin.listUsers();
    const authByEmail = new Map((users.users || []).map(item => [String(item.email || "").toLowerCase(), item.id]));
    const rows = emails.map(email => ({
      attempt_id: attempt.id,
      application_id: attempt.application_id,
      reviewer_email: email,
      reviewer_user_id: authByEmail.get(email) || null,
      invited_by: user.id,
      status: "invited",
    }));
    const { error: insertError } = await admin.from("recruitment_test_reviews").upsert(rows, { onConflict: "attempt_id,reviewer_email" });
    if (insertError) return NextResponse.json({ message: insertError.message }, { status: 500 });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    await Promise.allSettled(emails.map(email => resend("/emails", {
      from: process.env.MAIL_FROM ?? "NutVitaGlobalis <contact@nutvitaglobalis.com>",
      to: [email],
      subject: "Invitation a corriger un test ecrit NutVitaGlobalis",
      text: `Bonjour,\n\nVous etes invite a corriger le test ecrit du candidat ${(attempt as any).recruitment_applications?.full_name || ""}.\nConnectez-vous avec cette adresse email sur NutVitaGlobalis pour acceder a votre mission de correction.\n\n${siteUrl}/candidat\n\nEquipe NutVitaGlobalis`,
    })));

    return NextResponse.json({ ok: true, count: emails.length });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Invitation impossible." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const admin = createAdminClient();
    const { error } = await admin
      .from("recruitment_test_reviews")
      .update({
        score: body.score === "" || body.score === null ? null : Number(body.score),
        comments: body.comments || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", String(body.review_id));
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    const { data: review } = await admin.from("recruitment_test_reviews").select("attempt_id").eq("id", String(body.review_id)).single();
    if (review?.attempt_id) {
      const { data: reviews } = await admin.from("recruitment_test_reviews").select("score").eq("attempt_id", review.attempt_id).not("score", "is", null);
      const scores = (reviews || []).map((item: any) => Number(item.score)).filter(score => !Number.isNaN(score));
      if (scores.length) {
        const average = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100;
        await admin.from("recruitment_test_attempts").update({ manual_score: average, status: "graded" }).eq("id", review.attempt_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Correction impossible." }, { status: 500 });
  }
}
