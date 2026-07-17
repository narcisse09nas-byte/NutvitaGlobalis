import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Testimonials() {
  return (
    <section className="py-20 bg-white">

      <div className="mx-auto max-w-7xl px-6">

        <SectionHeader
          eyebrow="Testimonials"
          title="What our learners say"
          description="Soon you will discover testimonials from nutrition professionals around the world."
        />

        <div className="grid gap-6 md:grid-cols-3">

          {[1,2,3].map((item)=>(
            <Card key={item}>

              <p className="italic text-slate-600">

                &ldquo;NutVitaGlobalis Academy transformed my professional practice.&rdquo;

              </p>

              <h4 className="mt-6 font-bold">

                Future learner #{item}

              </h4>

              <p className="text-sm text-slate-500">

                Nutrition Professional

              </p>

            </Card>
          ))}

        </div>

      </div>

    </section>
  );
}
