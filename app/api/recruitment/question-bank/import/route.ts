import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireMaximusApi } from "@/lib/maximus-api-auth";

type QuestionPayload = { prompt: string; promptEn?: string; options: string[]; optionsEn?: string[]; correctAnswers: string[]; correctAnswersEn?: string[]; detectedType: string; explanation?: string; explanationEn?: string };
const nutritionType = (value: string) => ["qcm", "multi_qcm", "open"].includes(value) ? value : "qcm";
const maximusType = (value: string) => value === "multi_qcm" ? "multiple_choice" : value === "open" ? "open" : "single_choice";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scope = String(body.scope);
    const category = String(body.category || "").trim();
    const forced = String(body.question_type || "auto");
    const questions = (Array.isArray(body.questions) ? body.questions : []) as QuestionPayload[];
    if (!category || !questions.length) return NextResponse.json({ message: "Catégorie et questions requises." }, { status: 400 });
    if (scope === "nutritionists") {
      const { supabase } = await requireAdmin();
      const rows = questions.map((question, index) => { const type = nutritionType(forced === "auto" ? question.detectedType : forced); return { category, question_type: type, prompt: question.prompt || question.promptEn || "", prompt_en: question.promptEn || null, options: question.options || [], options_en: question.optionsEn || [], correct_answer: (question.correctAnswers || []).join(","), correct_answer_en: (question.correctAnswersEn || []).join(","), explanation: question.explanation || null, explanation_en: question.explanationEn || null, points: 1, position: index + 1, active: true }; });
      const { error } = await supabase.from("recruitment_test_questions").insert(rows);
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ count: rows.length });
    }
    if (scope === "maximus") {
      const context = await requireMaximusApi("hr/recruitment/question-bank", "creator");
      if ("error" in context) return context.error;
      const rows = questions.map(question => { const type = maximusType(forced === "auto" ? question.detectedType : forced); return { category, question_type: type, prompt: question.prompt || question.promptEn || "", prompt_en: question.promptEn || null, options: question.options || [], options_en: question.optionsEn || [], correct_answers: question.correctAnswers || [], correct_answers_en: question.correctAnswersEn || [], explanation: question.explanation || null, explanation_en: question.explanationEn || null, points: 1, active: true, created_by: context.user.id }; });
      const { error } = await context.supabase.from("maximus_recruitment_question_bank").insert(rows);
      if (error) return NextResponse.json({ message: error.message }, { status: 400 });
      return NextResponse.json({ count: rows.length });
    }
    return NextResponse.json({ message: "Portée inconnue." }, { status: 400 });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Import impossible." }, { status: 500 }); }
}