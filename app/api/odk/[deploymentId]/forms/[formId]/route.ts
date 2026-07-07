import { buildXFormXml } from "@/survey/lib/odk-deployment";
import { isAuthorized, loadOdkForm, unauthorized, xmlResponse } from "../../helpers";

export async function GET(request: Request, { params }: { params: Promise<{ deploymentId: string; formId: string }> }) {
  const { deploymentId, formId } = await params;
  const form = await loadOdkForm(deploymentId);
  if (!form || form.odk_status !== "deployed") return xmlResponse("<error>Formulaire ODK introuvable.</error>", 404);
  if (!isAuthorized(request, form)) return unauthorized();
  const requested = decodeURIComponent(formId).replace(/\.xml$/i, "");
  if (requested !== form.form_code) return xmlResponse("<error>Identifiant de formulaire invalide.</error>", 404);
  return xmlResponse(form.xform_xml || buildXFormXml(form));
}
