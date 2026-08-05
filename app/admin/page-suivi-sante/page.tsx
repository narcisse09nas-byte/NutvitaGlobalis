import AdminShell from "@/components/admin/AdminShell";
import HealthRecordPageEditor from "@/components/admin/HealthRecordPageEditor";
import { requireAdmin } from "@/lib/admin";
import { getHealthRecordPageSettings } from "@/lib/health-record-page";

export default async function Page(){const{admin}=await requireAdmin();const settings=await getHealthRecordPageSettings();return <AdminShell name={admin.full_name||admin.email}><div className="mb-7"><p className="text-sm font-black uppercase tracking-widest text-leaf">Suivi santé</p><h1 className="text-4xl font-black">Page « Mes paramètres »</h1><p className="mt-3 text-slate-500">Administrez les textes, conseils et l’illustration en français et en anglais. Les mesures, indicateurs et historiques demeurent propres à chaque client.</p></div><HealthRecordPageEditor initial={settings}/></AdminShell>}
