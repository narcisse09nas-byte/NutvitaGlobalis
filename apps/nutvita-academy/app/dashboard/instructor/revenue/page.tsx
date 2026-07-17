import { InstructorRevenueDashboard } from "@/components/marketplace/InstructorRevenueDashboard";
export default function Page() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Instructor Studio
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        Revenus formateur
      </h1>
      <div className="mt-8">
        <InstructorRevenueDashboard />
      </div>
    </div>
  );
}
