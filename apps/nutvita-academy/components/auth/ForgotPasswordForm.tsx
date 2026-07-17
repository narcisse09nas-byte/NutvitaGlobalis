"use client";

import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { useLanguage } from "@/hooks/use-language";

export function ForgotPasswordForm() {
  const { locale, t } = useLanguage();
  return (
    <div className="space-y-5">
      <Alert
        variant="info"
        title={locale === "fr" ? "Mode local" : "Local mode"}
      >
        {locale === "fr"
          ? "La réinitialisation du mot de passe sera activée lors de la migration vers Supabase. Pour vos essais locaux, créez un nouveau compte depuis la page d’inscription."
          : "Password reset will be enabled with the Supabase migration. For local testing, create a new account from the registration page."}
      </Alert>

      <p className="text-center text-sm text-slate-600">
        {locale === "fr"
          ? "Vous vous souvenez du mot de passe ?"
          : "Remember your password?"}{" "}
        <Link href="/login" className="font-bold text-[#0B5D3B]">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
