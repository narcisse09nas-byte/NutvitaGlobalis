import { buildOpenRosaFormListXml } from "@/survey/lib/odk-deployment";
import { isAuthorized, loadOdkForm, unauthorized, xmlResponse } from "../helpers";

export async function GET(request: Request, { params }: { params: Promise<{ deploymentId: string }> }) {
  const { deploymentId } = await params;
  const form = await loadOdkForm(deploymentId);
  if (!form || form.odk_status !== "deployed") return xmlResponse("<error>Formulaire ODK introuvable.</error>", 404);
  if (!isAuthorized(request, form)) return unauthorized();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  return xmlResponse(buildOpenRosaFormListXml(form.odk_configuration || {}, form, origin));
}
