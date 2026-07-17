"use client";

import { LocalAuthGuard } from "@/components/auth/LocalAuthGuard";
import { LocalAuthProvider } from "@/components/auth/LocalAuthProvider";
import { ProgressProvider } from "@/components/progress/ProgressProvider";

export function LocalLearningProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocalAuthProvider>
      <LocalAuthGuard>
        <ProgressProvider>{children}</ProgressProvider>
      </LocalAuthGuard>
    </LocalAuthProvider>
  );
}
