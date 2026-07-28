import PartnerShell from "@/components/partner/PartnerShell";
import RegionalMealPlanner from "@/components/partner/RegionalMealPlanner";
import { requirePartner } from "@/lib/partner";

export default async function Page() {
  const { user } = await requirePartner();
  return (
    <PartnerShell email={user.email || ""}>
      <div className="mb-7">
        <h1 className="text-3xl font-black">Menus et équivalents régionaux</h1>
        <p className="mt-2 max-w-3xl text-slate-500">
          Préparez un brouillon de plan alimentaire local, puis validez-le selon le dossier clinique, les analyses, les traitements et les préférences du patient.
        </p>
      </div>
      <RegionalMealPlanner />
    </PartnerShell>
  );
}
