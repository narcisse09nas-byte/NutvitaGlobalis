import ProfessionalRecruitmentLanding from "@/components/recruitment/ProfessionalRecruitmentLanding";
import {getCurrentLocale} from "@/lib/i18n-server";
export default async function Page(){const locale=await getCurrentLocale();return <ProfessionalRecruitmentLanding kind="promoter" locale={locale==="en"?"en":"fr"}/>}
