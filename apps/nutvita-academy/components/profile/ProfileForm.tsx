"use client";

import { FormEvent, useState } from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { countries } from "@/data/auth-options";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useLanguage } from "@/hooks/use-language";

export function ProfileForm() {
  const { text } = useLanguage();
  const { user, updateProfile } = useLocalAuth();

  const [message, setMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(null);
    setError(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    const fullName = String(formData.get("fullName") ?? "").trim();

    const phone = String(formData.get("phone") ?? "").trim();

    const profession = String(formData.get("profession") ?? "").trim();

    const country = String(formData.get("country") ?? "").trim();

    const legalName = String(formData.get("legalName") ?? "").trim();
    const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
    const nationality = String(formData.get("nationality") ?? "").trim();

    if (!fullName) {
      setError(
        text("Le nom complet est obligatoire.", "Full name is required."),
      );

      setIsSaving(false);
      return;
    }

    if (!user) {
      setError(
        text(
          "Votre session locale a expiré.",
          "Your local session has expired.",
        ),
      );
      setIsSaving(false);
      return;
    }

    const result = await updateProfile({
      fullName,
      phone,
      profession,
      country,
      legalName,
      dateOfBirth,
      nationality,
    });

    if (!result.success) {
      setError(
        text(
          "Le profil n’a pas pu être mis à jour.",
          "The profile could not be updated.",
        ),
      );

      setIsSaving(false);
      return;
    }

    setMessage(
      text(
        "Votre profil a été mis à jour avec succès.",
        "Your profile was updated successfully.",
      ),
    );

    setIsSaving(false);
  }

  return (
    <Card>
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        {text("Modifier mon profil", "Edit my profile")}
      </h2>

      <p className="mt-3 text-sm text-slate-600">
        {text(
          "Ces informations seront utilisées dans votre espace apprenant et sur vos futurs certificats.",
          "This information will be used in your learner workspace and on future certificates.",
        )}
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        {message && (
          <Alert
            variant="success"
            title={text("Profil enregistré", "Profile saved")}
          >
            {message}
          </Alert>
        )}

        {error && (
          <Alert
            variant="danger"
            title={text("Modification impossible", "Unable to update")}
          >
            {error}
          </Alert>
        )}

        <Input
          label={text("Nom complet", "Full name")}
          name="fullName"
          defaultValue={user.fullName}
          required
        />

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-950">
            {text("Identité certifiante", "Certification identity")}
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-900">
            {text(
              "Ces informations doivent être identiques à votre passeport ou carte nationale. Elles servent au contrôle d’identité et à la certification.",
              "This information must match your passport or national identity card. It is used for identity verification and certification.",
            )}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              label={text("Nom légal sur la pièce", "Legal name on ID")}
              name="legalName"
              defaultValue={user.legalName ?? user.fullName}
              required
            />
            <Input
              label={text("Date de naissance", "Date of birth")}
              name="dateOfBirth"
              type="date"
              defaultValue={user.dateOfBirth ?? ""}
              required
            />
            <Input
              label={text("Nationalité", "Nationality")}
              name="nationality"
              defaultValue={user.nationality ?? ""}
              required
            />
          </div>
        </div>

        <Input
          label={text("Adresse email", "Email address")}
          name="email"
          type="email"
          defaultValue={user.email}
          disabled
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            label={text("Téléphone WhatsApp", "WhatsApp phone")}
            name="phone"
            type="tel"
            defaultValue={user.phone ?? ""}
            placeholder="+237..."
          />

          <Input
            label={text("Profession", "Profession")}
            name="profession"
            defaultValue={user.profession ?? ""}
            placeholder={text(
              "Nutritionniste, médecin…",
              "Nutritionist, physician…",
            )}
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-[#063D2E]">
            {text("Pays", "Country")}
          </span>

          <select
            name="country"
            defaultValue={user.country || "Cameroon"}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
          >
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" variant="secondary" disabled={isSaving}>
          {isSaving
            ? text("Enregistrement…", "Saving…")
            : text("Enregistrer les modifications", "Save changes")}
        </Button>
      </form>
    </Card>
  );
}
