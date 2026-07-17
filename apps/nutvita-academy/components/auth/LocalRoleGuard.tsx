"use client";

import { useEffect } from "react";
import {
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import type { LocalUserRole } from "@/types/local-auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/hooks/use-language";

type LocalRoleGuardProps = {
  children: React.ReactNode;
  allowedRoles: LocalUserRole[];
};

export function LocalRoleGuard({
  children,
  allowedRoles,
}: LocalRoleGuardProps) {
  const { text } = useLanguage();

  const {
    user,
    isLoading,
    isAuthenticated,
  } = useLocalAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const origin = process.env.NEXT_PUBLIC_PLATFORM_ORIGIN?.replace(/\/$/, "") ?? "";
      window.location.assign(`${origin}/connexion?redirect=${encodeURIComponent("/choisir-acces")}`);
    }
  }, [
    isAuthenticated,
    isLoading,
  ]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle
          size={38}
          className="animate-spin text-[#0B5D3B]"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isAllowed =
    allowedRoles.includes(user.role);

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <ShieldAlert size={32} />
          </div>

          <h1 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
            {text("Accès non autorisé", "Access denied")}
          </h1>

          <p className="mt-4 text-slate-600">
            {text(
              "Votre rôle actuel ne permet pas d’accéder à cette section.",
              "Your current role cannot access this section.",
            )}
          </p>

          <Button
            href="/dashboard"
            variant="secondary"
            className="mt-6"
          >
            {text("Retour au tableau de bord", "Back to dashboard")}
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
