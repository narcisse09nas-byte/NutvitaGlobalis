import { CreateOrganizationForm } from "@/components/tenancy/CreateOrganizationForm";
import { LocalizedText } from "@/components/i18n/LocalizedText";
export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="font-bold uppercase tracking-wider text-[#F58220]">
        Multi-tenant
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        <LocalizedText fr="Créer une organisation" en="Create an organization" />
      </h1>
      <div className="mt-8">
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
