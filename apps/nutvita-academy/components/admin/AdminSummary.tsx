"use client";

import {
  BookOpen,
  FileCheck2,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAdmin } from "@/hooks/use-admin";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useExam } from "@/hooks/use-exam";
import { useCertificates } from "@/hooks/use-certificates";
import { useLanguage } from "@/hooks/use-language";

export function AdminSummary() {
  const { text } = useLanguage();
  const { data } = useAdmin();
  const { data: studio } =
    useInstructorStudio();
  const { attempts } = useExam();
  const { certificates } =
    useCertificates();

  const cards = [
    {
      label: text("Utilisateurs", "Users"),
      value: data.users.length,
      icon: Users,
    },
    {
      label: text("Cours Studio", "Studio courses"),
      value: studio.courses.length,
      icon: BookOpen,
    },
    {
      label: text("Examens passés", "Exams taken"),
      value: attempts.length,
      icon: FileCheck2,
    },
    {
      label: text("Certificats", "Certificates"),
      value: certificates.length,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.label}
            className="rounded-[24px] border border-green-100 bg-white p-6"
          >
            <Icon className="text-[#0B5D3B]" />
            <p className="mt-4 text-3xl font-extrabold text-[#063D2E]">
              {card.value}
            </p>
            <p className="text-sm text-slate-500">
              {card.label}
            </p>
          </article>
        );
      })}
    </div>
  );
}
