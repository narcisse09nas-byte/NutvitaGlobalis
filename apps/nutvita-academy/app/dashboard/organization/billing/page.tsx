"use client";
import {
  organizationLicenses,
  organizationPlanLabels,
} from "@/config/tenant-plans";
import { useTenant } from "@/hooks/use-tenant";
import { useLanguage } from "@/hooks/use-language";
export default function Page() {
  const { text } = useLanguage();
  const { activeOrganization } = useTenant();
  if (!activeOrganization) return null;
  const l = organizationLicenses[activeOrganization.plan];
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-4xl font-extrabold text-[#063D2E]">
        {text("Licence organisation", "Organization license")}
      </h1>
      <section className="mt-8 rounded-[28px] border bg-white p-7">
        <p className="text-3xl font-extrabold text-[#F58220]">
          {organizationPlanLabels[activeOrganization.plan]}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F8FAFC] p-5">
            {l.maxMembers} {text("membres", "members")}
          </div>
          <div className="rounded-2xl bg-[#F8FAFC] p-5">
            {l.maxCourses} {text("cours", "courses")}
          </div>
          <div className="rounded-2xl bg-[#F8FAFC] p-5">{l.storageGb} GB</div>
          <div className="rounded-2xl bg-[#F8FAFC] p-5">
            {l.aiCreditsMonthly} {text("crédits IA", "AI credits")}
          </div>
        </div>
      </section>
    </div>
  );
}
