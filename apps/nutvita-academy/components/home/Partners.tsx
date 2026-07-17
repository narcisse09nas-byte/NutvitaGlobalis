import { SectionHeader } from "@/components/ui/SectionHeader";

const partners = [
  "WHO",
  "UNICEF",
  "WFP",
  "FAO",
  "Universities",
];

export function Partners() {
  return (
    <section className="py-20 bg-[#063D2E] text-white">

      <div className="mx-auto max-w-7xl px-6">

        <SectionHeader
          eyebrow="Future Partners"
          title="Building global partnerships"
          description="NutVitaGlobalis Academy aims to collaborate with leading institutions in nutrition, public health and humanitarian action."
        />

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-5">

          {partners.map((partner)=>(
            <div
              key={partner}
              className="rounded-xl border border-white/20 p-6 text-center text-xl font-bold"
            >
              {partner}
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}