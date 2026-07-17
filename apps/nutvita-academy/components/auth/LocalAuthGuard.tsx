"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

export function LocalAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { text } = useLanguage();

  const {
    isAuthenticated,
    isLoading,
  } = useLocalAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const origin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.replace(/\/$/, "") ?? "";
      window.location.assign(`${origin}/connexion?redirect=${encodeURIComponent("/choisir-acces")}`);
    }
  }, [
    isAuthenticated,
    isLoading,
    text,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-[#0B5D3B]"
            size={38}
          />

          <p className="mt-4 font-semibold text-slate-600">
            {text("Chargement de votre session…", "Loading your session…")}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
