import type {
  CertificationRequirement,
} from "@/types/certification";

export const certificationRequirements: Record<
  string,
  CertificationRequirement
> = {
  camms: {
    courseSlug: "camms",

    requiredQuizSlugs: [
      "camms-module-1",
    ],

    requiredExamSlug:
      "camms-final",

    minimumCourseProgress: 100,
  },
};

export function getCertificationRequirement(
  courseSlug: string
): CertificationRequirement | null {
  return (
    certificationRequirements[
      courseSlug
    ] ?? null
  );
}