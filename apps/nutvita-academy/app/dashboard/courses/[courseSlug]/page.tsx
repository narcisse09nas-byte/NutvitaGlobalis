import { PublishedCourseResolver } from "@/components/courses/PublishedCourseResolver";

export default async function CourseDashboardPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  return <PublishedCourseResolver courseSlug={courseSlug} />;
}
