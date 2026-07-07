import { createAdminClient } from "@/lib/supabase/admin";
import { parseOdkSubmission } from "@/survey/lib/odk-deployment";
import { isAuthorized, loadOdkForm, unauthorized, xmlResponse } from "../helpers";

async function readSubmission(request: Request, formCode: string) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json();
    return {
      answers: body.answers && typeof body.answers === "object" ? body.answers : body,
      raw: body,
      format: "json",
    };
  }
  if (contentType.includes("multipart/form-data")) {
    const data = await request.formData();
    const file = data.get("xml_submission_file") || data.get("submission") || Array.from(data.values()).find(value => typeof value !== "string");
    const text = typeof file === "string" ? file : file && "text" in file ? await file.text() : "";
    return { answers: parseOdkSubmission(text, formCode), raw: text, format: "multipart_xml" };
  }
  const text = await request.text();
  return { answers: parseOdkSubmission(text, formCode), raw: text, format: "xml" };
}

export async function POST(request: Request, { params }: { params: Promise<{ deploymentId: string }> }) {
  const { deploymentId } = await params;
  const form = await loadOdkForm(deploymentId);
  if (!form || form.odk_status !== "deployed") return xmlResponse("<error>Formulaire ODK introuvable.</error>", 404);
  if (!isAuthorized(request, form)) return unauthorized();

  const submission = await readSubmission(request, form.form_code);
  const supabase = createAdminClient();
  const reference = `ODK-${form.form_code}-${Date.now().toString(36).toUpperCase()}`;
  const { error } = await supabase.from("survey_responses").insert({
    survey_id: form.survey_id,
    form_id: form.id,
    source_type: "odk",
    response_reference: reference,
    cluster_reference: "ODK",
    response_data: {
      form_id: form.id,
      form_code: form.form_code,
      source: "odk",
      format: submission.format,
      answers: submission.answers,
      raw_submission: submission.raw,
    },
  });
  if (error) return xmlResponse(`<error>${error.message}</error>`, 400);

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<OpenRosaResponse xmlns="http://openrosa.org/http/response">
  <message nature="submit_success">Soumission recue: ${reference}</message>
</OpenRosaResponse>`, 201);
}
