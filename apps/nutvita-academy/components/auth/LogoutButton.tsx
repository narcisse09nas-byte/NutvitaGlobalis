"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useLocalAuth();
  const { text } = useLanguage();

  function handleLogout() {
    logout();

    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-green-50 transition hover:bg-white/10"
    >
      <LogOut size={19} />
      {text("Déconnexion", "Sign out")}
    </button>
  );
}
