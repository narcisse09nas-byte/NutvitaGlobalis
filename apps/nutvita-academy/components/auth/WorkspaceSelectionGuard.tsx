"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

export function WorkspaceSelectionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading, requiresWorkspaceSelection } = useLocalAuth();
  const { text } = useLanguage();
  useEffect(() => {
    if (!isLoading && requiresWorkspaceSelection)
      router.replace("/session-select");
  }, [isLoading, requiresWorkspaceSelection, router]);
  if (isLoading || requiresWorkspaceSelection)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] font-bold text-[#063D2E]">
        {text("Préparation de votre espace…", "Preparing your workspace…")}
      </div>
    );
  return children;
}
