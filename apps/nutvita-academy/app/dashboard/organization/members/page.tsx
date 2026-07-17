import { MembersManager } from "@/components/tenancy/MembersManager";
import { LocalizedText } from "@/components/i18n/LocalizedText";
export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <p className="font-bold uppercase tracking-wider text-[#F58220]">
        <LocalizedText fr="Organisation" en="Organization" />
      </p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        <LocalizedText fr="Membres et rôles" en="Members and roles" />
      </h1>
      <div className="mt-8">
        <MembersManager />
      </div>
    </div>
  );
}
