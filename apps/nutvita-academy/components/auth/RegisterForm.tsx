"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { countries } from "@/data/auth-options";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/hooks/use-language";

export function RegisterForm() {
  const router = useRouter();

  const { register } = useLocalAuth();
  const { locale, t, text } = useLanguage();

  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const fullName = String(formData.get("fullName") ?? "").trim();

    const email = String(formData.get("email") ?? "").trim();

    const phone = String(formData.get("phone") ?? "").trim();

    const profession = String(formData.get("profession") ?? "").trim();

    const country = String(formData.get("country") ?? "").trim();

    const password = String(formData.get("password") ?? "");

    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError(
        text(
          "Le mot de passe doit contenir au moins 8 caractères.",
          "The password must contain at least 8 characters.",
        ),
      );

      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(
        text("Les deux mots de passe ne correspondent pas.", "Passwords do not match."),
      );

      setIsSubmitting(false);
      return;
    }

    const result = await register({
      fullName,
      email,
      phone,
      profession,
      country,
      password,
    });

    if (!result.success) {
      setError(result.error ?? text("Inscription impossible.", "Unable to register."));

      setIsSubmitting(false);
      return;
    }

    router.push(
      result.requiresEmailConfirmation ? "/auth/check-email" : "/dashboard",
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      {error && (
        <Alert
          variant="danger"
          title={
            locale === "fr" ? "Inscription impossible" : "Unable to register"
          }
        >
          {error}
        </Alert>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label={locale === "fr" ? "Nom complet" : "Full name"}
          name="fullName"
          placeholder={locale === "fr" ? "Votre nom complet" : "Your full name"}
          autoComplete="name"
          required
        />

        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="exemple@email.com"
          autoComplete="email"
          required
        />

        <Input
          label={locale === "fr" ? "Téléphone WhatsApp" : "WhatsApp phone"}
          name="phone"
          type="tel"
          placeholder="+237..."
          autoComplete="tel"
        />

        <Input
          label={locale === "fr" ? "Profession" : "Occupation"}
          name="profession"
          placeholder={
            locale === "fr" ? "Nutritionniste, médecin…" : "Nutritionist, physician…"
          }
        />
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[#063D2E]">
          {locale === "fr" ? "Pays" : "Country"}
        </span>

        <select
          name="country"
          defaultValue="Cameroon"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
        >
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label={t("password")}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />

        <Input
          label={
            locale === "fr" ? "Confirmer le mot de passe" : "Confirm password"
          }
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-600">
        <input type="checkbox" name="terms" required className="mt-1" />

        <span>
          {locale === "fr"
            ? "J’accepte les conditions d’utilisation et la politique de confidentialité de NutVitaGlobalis Academy."
            : "I accept NutVitaGlobalis Academy’s terms of use and privacy policy."}
        </span>
      </label>

      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? locale === "fr"
            ? "Création du compte..."
            : "Creating account..."
          : locale === "fr"
            ? "Créer mon compte"
            : "Create my account"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        {locale === "fr" ? "Déjà inscrit ?" : "Already registered?"}{" "}
        <Link href="/login" className="font-bold text-[#0B5D3B]">
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}
