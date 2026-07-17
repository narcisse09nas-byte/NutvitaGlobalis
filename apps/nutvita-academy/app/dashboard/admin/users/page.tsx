"use client";

import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { useLanguage } from "@/hooks/use-language";

export default function AdminUsersPage() {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Administration
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {text("Utilisateurs et rôles", "Users and roles")}
      </h1>

      <div className="mt-8">
        <AdminUsersManager />
      </div>
    </div>
  );
}
