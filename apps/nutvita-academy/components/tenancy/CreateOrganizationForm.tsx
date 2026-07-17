"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/hooks/use-tenant";
import { useLanguage } from "@/hooks/use-language";

export function CreateOrganizationForm() {
  const router = useRouter();
  const { createNewOrganization } = useTenant();
  const { text } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("Cameroun");
  const [city, setCity] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    const organization = createNewOrganization({
      name: name.trim(),
      description: description.trim(),
      country: country.trim(),
      city: city.trim(),
    });
    if (organization) router.push("/dashboard/organization");
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] border border-green-100 bg-white p-7">
      <div className="grid gap-5 md:grid-cols-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={text("Nom de l’organisation", "Organization name")} className="h-12 rounded-2xl border border-slate-200 px-4 md:col-span-2" />
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={text("Description", "Description")} rows={4} className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
        <input value={country} onChange={(event) => setCountry(event.target.value)} aria-label={text("Pays", "Country")} className="h-12 rounded-2xl border border-slate-200 px-4" />
        <input value={city} onChange={(event) => setCity(event.target.value)} placeholder={text("Ville", "City")} className="h-12 rounded-2xl border border-slate-200 px-4" />
      </div>
      <button className="mt-7 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white">
        {text("Créer l’organisation", "Create organization")}
      </button>
    </form>
  );
}
