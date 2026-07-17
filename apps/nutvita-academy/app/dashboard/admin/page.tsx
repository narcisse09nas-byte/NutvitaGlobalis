"use client";

import Link from "next/link";
import { Settings, Users } from "lucide-react";

import { AdminSummary } from "@/components/admin/AdminSummary";
import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";
import { useLanguage } from "@/hooks/use-language";

export default function AdminPage() {
  const { text } = useLanguage();
  return (
    <LocalRoleGuard allowedRoles={["admin", "super_admin"]}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          Administration
        </p>

        <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
          {text("Centre administrateur", "Administration center")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Supervisez les utilisateurs, formations, évaluations et certificats.",
            "Manage users, courses, assessments and certificates.",
          )}
        </p>

        <div className="mt-8">
          <AdminSummary />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Link
            href="/dashboard/admin/users"
            className="rounded-[24px] border border-green-100 bg-white p-6"
          >
            <Users className="text-[#0B5D3B]" />
            <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
              {text("Gérer les utilisateurs", "Manage users")}
            </h2>
          </Link>

          <Link
            href="/dashboard/instructor"
            className="rounded-[24px] border border-green-100 bg-white p-6"
          >
            <Settings className="text-[#F58220]" />
            <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
              {text("Ouvrir Instructor Studio", "Open Instructor Studio")}
            </h2>
          </Link>
        </div>
      </div>
    </LocalRoleGuard>
  );
}
