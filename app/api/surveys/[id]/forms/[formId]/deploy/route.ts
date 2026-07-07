import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildXFormXml, validateOdkForm } from "@/survey/lib/odk-deployment";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function md5(value: string) {
  return createHash("md5").update(value).digest("hex");
}

function password() {
  return randomBytes(18).toString("base64url");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; formId: string }> }) {
  const { id, formId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Authentification requise." }, { status: 401 });

  const { data: allowed, error: permissionError } = await supabase.rpc("can_manage_survey", { p_survey_id: id });
  if (permissionError) return NextResponse.json({ message: permissionError.message }, { status: 400 });
  if (!allowed) return NextResponse.json({ message: "Acces refuse pour cette enquete." }, { status: 403 });

  const { data: form, error } = await supabase
    .from("survey_forms")
    .select("*")
    .eq("id", formId)
    .eq("survey_id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  if (!form) return NextResponse.json({ message: "Questionnaire introuvable." }, { status: 404 });

  const issues = validateOdkForm(form);
  const errors = issues.filter(issue => issue.level === "error");
  if (errors.length) {
    await supabase.from("survey_forms").update({
      odk_status: "error",
      odk_configuration: {
        ...(form.odk_configuration || {}),
        last_validation_at: new Date().toISOString(),
        validation_issues: issues,
      },
    }).eq("id", form.id).eq("survey_id", id);
    return NextResponse.json({ message: "Le questionnaire n'est pas compatible ODK.", issues }, { status: 422 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const deploymentId = form.odk_configuration?.deployment_id || randomBytes(12).toString("hex");
  const username = form.odk_configuration?.username || `odk_${String(form.form_code || "form").replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`;
  const secret = password();
  const xformXml = buildXFormXml(form);
  const serverUrl = `${origin}/api/odk/${deploymentId}`;
  const formListUrl = `${serverUrl}/formList`;
  const submissionUrl = `${serverUrl}/submission`;
  const configuration = {
    ...(form.odk_configuration || {}),
    mode: "nutvita_odk_bridge",
    deployment_id: deploymentId,
    server_url: serverUrl,
    form_list_url: formListUrl,
    submission_url: submissionUrl,
    username,
    password_hash: sha256(secret),
    password_hint: "Mot de passe genere automatiquement. Regenerer le deploiement si la cle est perdue.",
    xform_hash: `md5:${md5(xformXml)}`,
    validation_issues: issues,
    last_validation_at: new Date().toISOString(),
    deployed_by: user.id,
  };

  const { data: updated, error: updateError } = await supabase
    .from("survey_forms")
    .update({
      status: "endorsed",
      odk_status: "deployed",
      odk_configuration: configuration,
      xform_xml: xformXml,
      odk_deployed_at: new Date().toISOString(),
      status_history: [
        ...(Array.isArray(form.status_history) ? form.status_history : []),
        { status: "endorsed", at: new Date().toISOString(), source: "odk_deploy" },
      ],
    })
    .eq("id", form.id)
    .eq("survey_id", id)
    .select("*")
    .single();
  if (updateError) return NextResponse.json({ message: updateError.message }, { status: 400 });

  return NextResponse.json({
    item: updated,
    issues,
    credentials: {
      server_url: serverUrl,
      form_list_url: formListUrl,
      submission_url: submissionUrl,
      username,
      password: secret,
      bearer_key: secret,
    },
  });
}
