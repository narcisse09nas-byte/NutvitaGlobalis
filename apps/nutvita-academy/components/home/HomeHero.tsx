import { Button } from "@/components/ui/Button";

export function HomeHero() {
  return (
    <section className="bg-[#063D2E] text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-4 font-bold text-[#F58220]">
            NutVitaGlobalis Academy
          </p>

          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
            Become a Certified Nutrition Professional
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-green-50">
            Professional certifications in Nutrition, Public Health, Food
            Security and Digital Health — designed for practitioners, students
            and humanitarian professionals.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="#courses" variant="secondary">
              Explore Courses
            </Button>
            <Button href="#journey" variant="outline">
              Start Learning
            </Button>
          </div>
        </div>

        <div className="rounded-[32px] bg-white/10 p-8">
          <div className="rounded-[28px] bg-white p-8 text-[#063D2E] shadow-xl">
            <p className="text-sm font-bold text-[#F58220]">
              Featured Certification
            </p>
            <h2 className="mt-3 text-3xl font-extrabold">
              Acute Malnutrition Management
            </h2>
            <p className="mt-4 text-slate-600">
              Learn to identify, refer, treat and monitor children with acute
              malnutrition using practical field-based learning.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm font-bold">
              <span className="rounded-full bg-[#DDF5E8] px-4 py-2">
                45–60h
              </span>
              <span className="rounded-full bg-orange-100 px-4 py-2">
                100 USD
              </span>
              <span className="rounded-full bg-[#DDF5E8] px-4 py-2">
                FR + EN
              </span>
              <span className="rounded-full bg-orange-100 px-4 py-2">
                QR Certificate
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}