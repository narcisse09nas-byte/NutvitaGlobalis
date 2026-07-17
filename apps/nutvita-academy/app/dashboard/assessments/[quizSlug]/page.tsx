import { PublishedQuizResolver } from "@/components/quizzes/PublishedQuizResolver";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ quizSlug: string }>;
}) {
  const { quizSlug } = await params;
  return <PublishedQuizResolver quizSlug={quizSlug} />;
}
