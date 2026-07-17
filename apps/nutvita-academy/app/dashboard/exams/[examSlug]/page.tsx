import { PublishedExamResolver } from "@/components/exams/PublishedExamResolver";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ examSlug: string }>;
}) {
  const { examSlug } = await params;
  return <PublishedExamResolver examSlug={examSlug} />;
}
