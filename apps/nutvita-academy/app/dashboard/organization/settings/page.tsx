import { OrganizationSettingsForm } from "@/components/tenancy/OrganizationSettingsForm";
import { LocalizedText } from "@/components/i18n/LocalizedText";
export default function Page() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-4xl font-extrabold text-[#063D2E]">
        <LocalizedText fr="Paramètres et branding" en="Settings and branding" />
      </h1>
      <div className="mt-8">
        <OrganizationSettingsForm />
      </div>
    </div>
  );
}
