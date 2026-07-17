"use client";

import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { useLanguage } from "@/hooks/use-language";

export default function ProfilePage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div>
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Mon compte", "My account")}
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("Mon profil", "My profile")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Consultez et mettez à jour vos informations personnelles.",
            "Review and update your personal information.",
          )}
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-3">
        <aside>
          <ProfileSummary />
        </aside>

        <section className="lg:col-span-2">
          <ProfileForm />
        </section>
      </div>
    </div>
  );
}
