import {
  Award,
  Globe2,
  Brain,
  Smartphone,
  FileCheck,
  BookOpenCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

const features = [
  {
    icon: Award,
    title: "International Certification",
    description: "Earn verifiable certificates designed for professionals and institutions.",
  },
  {
    icon: Globe2,
    title: "Bilingual Learning",
    description: "Courses available in French and English, with more languages planned.",
  },
  {
    icon: BookOpenCheck,
    title: "Real Case Studies",
    description: "Learn through practical scenarios inspired by field and clinical realities.",
  },
  {
    icon: Brain,
    title: "AI Learning Assistant",
    description: "Get guided support while learning complex nutrition concepts.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Study from your computer, tablet or smartphone.",
  },
  {
    icon: FileCheck,
    title: "Verified Certificates",
    description: "Certificates can include QR-code verification for authenticity.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <SectionHeader
          eyebrow="Why Choose Us"
          title="Built for serious nutrition professionals"
          description="NutVitaGlobalis Academy combines scientific rigor, practical learning and digital innovation."
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card key={feature.title}>
                <div className="mb-5 inline-flex rounded-2xl bg-[#DDF5E8] p-3 text-[#0B5D3B]">
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-extrabold text-[#063D2E]">
                  {feature.title}
                </h3>
                <p className="mt-3 text-slate-600">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
