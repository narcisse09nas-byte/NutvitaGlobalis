import AdminShell from "@/components/admin/AdminShell";
import CommunicationCenter from "@/components/communications/CommunicationCenter";
import { requireAdmin } from "@/lib/admin";

export default async function Page() {
  const { admin } = await requireAdmin();
  return <AdminShell name={admin.full_name || admin.email}><CommunicationCenter scope="nutvita" /></AdminShell>;
}
