"use client";

import {
  BriefcaseBusiness,
  Globe2,
  Mail,
  Phone,
  UserCircle,
} from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { Card } from "@/components/ui/Card";
import { RoleBadge } from "@/components/profile/RoleBadge";
import { useLanguage } from "@/hooks/use-language";

export function ProfileSummary() {
  const { text } = useLanguage();
  const { user } = useLocalAuth();

  if (!user) {
    return null;
  }

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
          <UserCircle size={58} />
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {user.fullName}
        </h2>

        <div className="mt-3">
          <RoleBadge role={user.role} />
        </div>

        <div className="mt-7 w-full space-y-4 text-left text-sm">
          <div className="flex items-start gap-3 rounded-2xl bg-[#F8FAFC] p-4">
            <Mail size={19} className="mt-0.5 text-[#0B5D3B]" />

            <div>
              <p className="font-bold text-[#063D2E]">
                {text("Adresse email", "Email address")}
              </p>

              <p className="mt-1 break-all text-slate-600">{user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F8FAFC] p-4">
            <Phone size={19} className="mt-0.5 text-[#0B5D3B]" />

            <div>
              <p className="font-bold text-[#063D2E]">
                {text("Téléphone", "Phone")}
              </p>

              <p className="mt-1 text-slate-600">
                {user.phone || text("Non renseigné", "Not provided")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F8FAFC] p-4">
            <BriefcaseBusiness size={19} className="mt-0.5 text-[#0B5D3B]" />

            <div>
              <p className="font-bold text-[#063D2E]">
                {text("Profession", "Profession")}
              </p>

              <p className="mt-1 text-slate-600">
                {user.profession || text("Non renseignée", "Not provided")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-[#F8FAFC] p-4">
            <Globe2 size={19} className="mt-0.5 text-[#0B5D3B]" />

            <div>
              <p className="font-bold text-[#063D2E]">
                {text("Pays", "Country")}
              </p>

              <p className="mt-1 text-slate-600">
                {user.country || text("Non renseigné", "Not provided")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
