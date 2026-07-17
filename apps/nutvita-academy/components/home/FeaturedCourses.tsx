import { featuredCourses } from "@/data/courses";
import { MotionCard } from "@/components/ui/MotionCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function FeaturedCourses() {
  return (
    <section id="courses" className="bg-[#F8FAFC] py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Featured Certifications"
          title="Professional certifications for nutrition leaders"
          description="Build practical skills in clinical nutrition, humanitarian nutrition, food security and public health."
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featuredCourses.map((course) => (
            <MotionCard
              key={course.title}
              className="flex flex-col justify-between"
            >
              <div>
                <Badge>{course.category}</Badge>

                <h3 className="mt-5 text-xl font-extrabold text-[#063D2E]">
                  {course.title}
                </h3>

                <p className="mt-3 text-sm text-slate-600">
                  {course.titleFr}
                </p>

                <div className="mt-6 space-y-2 text-sm text-slate-700">
                  <p><strong>Duration:</strong> {course.duration}</p>
                  <p><strong>Level:</strong> {course.level}</p>
                  <p><strong>Price:</strong> {course.price}</p>
                </div>
              </div>

              <Button href="#" variant="outline" className="mt-6 w-full">
                View Course
              </Button>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}