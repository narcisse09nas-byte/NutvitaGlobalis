import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";
import { CourseStudioEditor } from "@/components/instructor/CourseStudioEditor";

type PageProps = { params: Promise<{ courseId: string }> };

export default async function AdminCoursePage({ params }: PageProps) {
  const { courseId } = await params;
  return <LocalRoleGuard allowedRoles={["admin", "super_admin"]}>
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <CourseStudioEditor courseId={courseId} />
    </div>
  </LocalRoleGuard>;
}
