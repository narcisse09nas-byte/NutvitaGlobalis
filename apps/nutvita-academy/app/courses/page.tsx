import { allCourses } from "@/data/courses";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export default function CoursesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="bg-[#063D2E] px-6 py-20 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-bold text-[#F58220]">NutVitaGlobalis Academy</p>

          <h1 className="mt-4 text-4xl font-extrabold md:text-6xl">
            <LocalizedText fr="Catalogue des certifications" en="Certification catalog" />
          </h1>

          <p className="mt-5 max-w-3xl text-green-50">
            <LocalizedText fr="Découvrez les certifications professionnelles NutVitaGlobalis en nutrition, santé publique, sécurité alimentaire et action humanitaire." en="Discover NutVitaGlobalis professional certifications in nutrition, public health, food security and humanitarian action." />
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allCourses.map((course) => (
            <Card key={course.slug} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <Badge>{course.code}</Badge>
                  <span className="text-sm font-bold text-[#F58220]">
                    {course.price}
                  </span>
                </div>

                <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
                  {course.title}
                </h2>

                <p className="mt-3 text-slate-600">{course.titleFr}</p>

                <div className="mt-6 space-y-2 text-sm text-slate-700">
                  <p>
                    <strong><LocalizedText fr="Catégorie :" en="Category:" /></strong> {course.category}
                  </p>
                  <p>
                    <strong><LocalizedText fr="Durée :" en="Duration:" /></strong> {course.duration}
                  </p>
                  <p>
                    <strong><LocalizedText fr="Niveau :" en="Level:" /></strong> {course.level}
                  </p>
                </div>
              </div>

              <Button href={course.href} variant="secondary" className="mt-6 w-full">
                <LocalizedText fr="Voir la formation" en="View course" />
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
