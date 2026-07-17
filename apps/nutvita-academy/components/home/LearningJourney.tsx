import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import {
  UserPlus,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Award,
} from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "Create your account",
    description:
      "Register in just a few minutes and access your learning dashboard.",
  },
  {
    icon: BookOpen,
    title: "Follow your course",
    description:
      "Watch videos, read learning materials and complete practical activities.",
  },
  {
    icon: ClipboardCheck,
    title: "Take quizzes",
    description:
      "Validate your knowledge throughout the training.",
  },
  {
    icon: GraduationCap,
    title: "Final assessment",
    description:
      "Complete the certification examination.",
  },
  {
    icon: Award,
    title: "Receive your certificate",
    description:
      "Download your secure certificate with QR code verification.",
  },
];

export function LearningJourney() {
  return (
    <section id="journey" className="py-20 bg-[#F8FAFC]">
      <div className="mx-auto max-w-7xl px-6">

        <SectionHeader
          eyebrow="Learning Journey"
          title="Your path to certification"
          description="A structured learning experience from registration to certification."
        />

        <div className="grid gap-6 md:grid-cols-5">

          {steps.map((step) => {

            const Icon = step.icon;

            return (

              <Card key={step.title} className="text-center">

                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF5E8]">

                  <Icon className="text-[#0B5D3B]" size={30} />

                </div>

                <h3 className="font-bold text-lg">

                  {step.title}

                </h3>

                <p className="mt-3 text-sm text-slate-600">

                  {step.description}

                </p>

              </Card>

            );

          })}

        </div>

      </div>
    </section>
  );
}