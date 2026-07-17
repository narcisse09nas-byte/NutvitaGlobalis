import { Suspense } from "react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Connexion"
        subtitle="Connectez-vous à votre espace NutVitaGlobalis Academy."
        titleEn="Sign in"
        subtitleEn="Sign in to your NutVitaGlobalis Academy workspace."
      >
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          }
        >
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
