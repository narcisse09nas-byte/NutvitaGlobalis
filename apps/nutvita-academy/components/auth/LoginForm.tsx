"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/hooks/use-language";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { login } = useLocalAuth();
  const { t } = useLanguage();

  const [error, setError] = useState<string | null>(searchParams.get("error"));

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "").trim();

    const password = String(formData.get("password") ?? "");

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error ?? "Connexion impossible.");

      setIsSubmitting(false);
      return;
    }

    router.push(
      result.requiresWorkspaceSelection ? "/session-select" : "/dashboard",
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {error && (
        <Alert variant="danger" title={t("loginError")}>
          {error}
        </Alert>
      )}

      <Input
        label={t("email")}
        name="email"
        type="email"
        placeholder="exemple@email.com"
        autoComplete="email"
        required
      />

      <Input
        label={t("password")}
        name="password"
        type="password"
        placeholder={t("password")}
        autoComplete="current-password"
        required
      />

      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" name="remember" />

          {t("remember")}
        </label>

        <Link href="/forgot-password" className="font-bold text-[#0B5D3B]">
          {t("forgotPassword")}
        </Link>
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? t("signingIn") : t("signIn")}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-bold text-[#0B5D3B]">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}
