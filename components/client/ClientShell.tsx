import { cookies } from "next/headers";
import ClientShellClient from "@/components/client/ClientShellClient";
import { getClientEntitlements, requireClient } from "@/lib/client";
import { getCurrentLocale } from "@/lib/i18n-server";

export default async function ClientShell({ children, email, service }: { children: React.ReactNode; email: string; service?: string }) {
  const { supabase, user } = await requireClient();
  const access = await getClientEntitlements(supabase, user.id);
  const activeService = service || (await cookies()).get("nutvita_active_service")?.value || "client";
  const english = (await getCurrentLocale()) === "en";
  return <ClientShellClient email={email} access={access} activeService={activeService} english={english}>{children}</ClientShellClient>;
}
