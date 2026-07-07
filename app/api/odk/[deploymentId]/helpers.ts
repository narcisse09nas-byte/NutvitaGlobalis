import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type OdkLoadedForm = {
  id: string;
  survey_id: string;
  title: string;
  form_code: string;
  version: string;
  xform_xml: string | null;
  odk_status: string;
  odk_configuration: Record<string, unknown>;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function loadOdkForm(deploymentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("survey_forms")
    .select("id,survey_id,title,form_code,version,xform_xml,odk_status,odk_configuration")
    .contains("odk_configuration", { deployment_id: deploymentId })
    .maybeSingle();
  if (error) throw error;
  return data as OdkLoadedForm | null;
}

export function isAuthorized(request: Request, form: OdkLoadedForm) {
  const configuration = form.odk_configuration || {};
  const expectedUsername = String(configuration.username || "");
  const expectedHash = String(configuration.password_hash || "");
  const authorization = request.headers.get("authorization") || "";
  const odkKey = request.headers.get("x-odk-key") || "";

  if (odkKey && expectedHash && safeEqual(sha256(odkKey), expectedHash)) return true;
  if (authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    return Boolean(token && expectedHash && safeEqual(sha256(token), expectedHash));
  }
  if (authorization.toLowerCase().startsWith("basic ")) {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return Boolean(
      username
      && password
      && safeEqual(username, expectedUsername)
      && expectedHash
      && safeEqual(sha256(password), expectedHash)
    );
  }
  return false;
}

export function unauthorized() {
  return new Response("ODK credentials required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="NutVitaGlobalis ODK"',
      "X-OpenRosa-Version": "1.0",
    },
  });
}

export function xmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "X-OpenRosa-Version": "1.0",
    },
  });
}
