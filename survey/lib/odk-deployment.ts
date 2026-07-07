import type { SurveyQuestion } from "./xlsform";

export type OdkValidationIssue = {
  level: "error" | "warning";
  field?: string;
  message: string;
};

type OdkForm = {
  id?: string;
  title?: string;
  form_code?: string;
  version?: string | number;
  definition?: {
    questions?: SurveyQuestion[];
    primaryLanguage?: string;
    secondaryLanguage?: string;
  };
};

const ODK_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_NAMES = new Set(["meta", "instanceID", "_id", "_uuid", "_submission_time", "_validation_status"]);
const SUPPORTED_TYPES = new Set([
  "text",
  "integer",
  "decimal",
  "date",
  "time",
  "geopoint",
  "select_one",
  "select_multiple",
  "note",
  "calculate",
  "begin_group",
  "end_group",
  "begin_repeat",
  "end_repeat",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function xml(value: unknown) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function label(question: SurveyQuestion) {
  return clean(question.labels?.fr || question.label || question.labels?.en || question.name);
}

function bindType(question: SurveyQuestion) {
  if (question.type === "integer") return "int";
  if (question.type === "decimal") return "decimal";
  if (question.type === "date") return "date";
  if (question.type === "time") return "time";
  if (question.type === "geopoint") return "geopoint";
  if (question.type === "select_one" || question.type === "select_multiple") return "select";
  return "string";
}

function expressionLooksBalanced(value?: string) {
  const expression = clean(value);
  if (!expression) return true;
  let parentheses = 0;
  let braces = 0;
  for (const char of expression) {
    if (char === "(") parentheses += 1;
    if (char === ")") parentheses -= 1;
    if (char === "{") braces += 1;
    if (char === "}") braces -= 1;
    if (parentheses < 0 || braces < 0) return false;
  }
  return parentheses === 0 && braces === 0;
}

export function validateOdkForm(form: OdkForm): OdkValidationIssue[] {
  const issues: OdkValidationIssue[] = [];
  const questions = form.definition?.questions || [];
  const names = new Set<string>();
  const stack: Array<"group" | "repeat"> = [];

  if (!clean(form.title)) issues.push({ level: "error", field: "title", message: "Le titre du formulaire est requis." });
  if (!clean(form.form_code)) issues.push({ level: "error", field: "form_code", message: "L'identifiant du formulaire est requis." });
  if (clean(form.form_code) && !ODK_NAME.test(clean(form.form_code))) {
    issues.push({ level: "error", field: "form_code", message: "L'identifiant du formulaire doit commencer par une lettre ou _ et ne contenir que lettres, chiffres ou _." });
  }
  if (!questions.length) issues.push({ level: "error", field: "questions", message: "Ajoutez au moins une question avant le deploiement." });

  questions.forEach((question, index) => {
    const field = `question_${index + 1}`;
    const type = clean(question.type);
    const name = clean(question.name);
    const structuralEnd = type === "end_group" || type === "end_repeat";
    if (!SUPPORTED_TYPES.has(type)) {
      issues.push({ level: "error", field, message: `Type ODK non supporte: ${type || "(vide)"}.` });
    }
    if (!structuralEnd) {
      if (!name) issues.push({ level: "error", field, message: "Chaque question doit avoir un nom de variable." });
      if (name && !ODK_NAME.test(name)) {
        issues.push({ level: "error", field, message: `Nom invalide "${name}". Utilisez lettres, chiffres ou _, sans espace, en commencant par une lettre ou _.` });
      }
      if (RESERVED_NAMES.has(name)) issues.push({ level: "error", field, message: `"${name}" est reserve par ODK et ne peut pas etre utilise comme variable.` });
      if (name && names.has(name)) issues.push({ level: "error", field, message: `Nom de variable en double: ${name}.` });
      if (name) names.add(name);
    }
    if (!structuralEnd && type !== "calculate" && !label(question)) {
      issues.push({ level: "error", field, message: `Le libelle de "${name || field}" est requis.` });
    }
    if ((type === "select_one" || type === "select_multiple") && !(question.options || []).length) {
      issues.push({ level: "error", field, message: `La question "${name || field}" doit avoir une liste de choix.` });
    }
    (question.options || []).forEach((option, optionIndex) => {
      if (!clean(option.value)) issues.push({ level: "error", field, message: `Option ${optionIndex + 1}: la valeur est requise.` });
      if (clean(option.value) && !ODK_NAME.test(clean(option.value))) {
        issues.push({ level: "error", field, message: `Option "${option.value}" invalide. Utilisez une valeur compatible ODK, sans espace.` });
      }
      if (!clean(option.label)) issues.push({ level: "warning", field, message: `Option "${option.value}" sans libelle lisible.` });
    });
    ["relevant", "constraint", "calculation", "choice_filter", "repeat_count"].forEach(key => {
      if (!expressionLooksBalanced((question as Record<string, unknown>)[key] as string)) {
        issues.push({ level: "error", field, message: `Expression ${key} mal formee: parentheses ou accolades non equilibrees.` });
      }
    });
    if (type === "begin_group") stack.push("group");
    if (type === "begin_repeat") stack.push("repeat");
    if (type === "end_group" && stack.pop() !== "group") issues.push({ level: "error", field, message: "Fin de groupe sans debut de groupe correspondant." });
    if (type === "end_repeat" && stack.pop() !== "repeat") issues.push({ level: "error", field, message: "Fin de repetition sans debut de repetition correspondant." });
  });

  if (stack.length) issues.push({ level: "error", field: "questions", message: "Un groupe ou une repetition n'est pas ferme." });
  if (!questions.some(question => question.type !== "note" && question.type !== "begin_group" && question.type !== "end_group")) {
    issues.push({ level: "warning", field: "questions", message: "Le formulaire ne contient presque que des notes; verifiez qu'il collecte bien des donnees." });
  }
  return issues;
}

export function buildXFormXml(form: OdkForm) {
  const formId = clean(form.form_code);
  const title = clean(form.title) || formId;
  const version = clean(form.version || "1");
  const questions = form.definition?.questions || [];
  const instanceFields = questions
    .filter(question => !["begin_group", "end_group", "begin_repeat", "end_repeat"].includes(question.type))
    .map(question => `        <${xml(question.name)}/>`).join("\n");
  const binds = questions
    .filter(question => !["begin_group", "end_group", "begin_repeat", "end_repeat"].includes(question.type))
    .map(question => {
      const attributes = [
        `nodeset="/${xml(formId)}/${xml(question.name)}"`,
        `type="${bindType(question)}"`,
      ];
      if (question.required) attributes.push('required="true()"');
      if (question.readonly) attributes.push('readonly="true()"');
      if (clean(question.relevant)) attributes.push(`relevant="${xml(question.relevant)}"`);
      if (clean(question.constraint)) attributes.push(`constraint="${xml(question.constraint)}"`);
      if (clean(question.calculation)) attributes.push(`calculate="${xml(question.calculation)}"`);
      return `      <bind ${attributes.join(" ")}/>`;
    }).join("\n");
  let depth = 0;
  const body = questions.map(question => {
    if (question.type === "end_group" || question.type === "end_repeat") {
      depth = Math.max(0, depth - 1);
      return `${"  ".repeat(depth + 3)}</group>`;
    }
    if (question.type === "begin_group" || question.type === "begin_repeat") {
      const line = `${"  ".repeat(depth + 3)}<group><label>${xml(label(question) || question.name)}</label>`;
      depth += 1;
      return line;
    }
    const indent = "  ".repeat(depth + 3);
    if (question.type === "note") return `${indent}<trigger ref="/${xml(formId)}/${xml(question.name)}"><label>${xml(label(question))}</label></trigger>`;
    if (question.type === "select_one" || question.type === "select_multiple") {
      const tag = question.type === "select_one" ? "select1" : "select";
      const items = (question.options || []).map(option => `${indent}  <item><label>${xml(option.label)}</label><value>${xml(option.value)}</value></item>`).join("\n");
      return `${indent}<${tag} ref="/${xml(formId)}/${xml(question.name)}"><label>${xml(label(question))}</label>\n${items}\n${indent}</${tag}>`;
    }
    if (question.type === "calculate") return "";
    if (question.type === "geopoint") return `${indent}<input ref="/${xml(formId)}/${xml(question.name)}" appearance="maps"><label>${xml(label(question))}</label></input>`;
    return `${indent}<input ref="/${xml(formId)}/${xml(question.name)}"><label>${xml(label(question))}</label></input>`;
  }).filter(Boolean).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<h:html xmlns:h="http://www.w3.org/1999/xhtml"
  xmlns="http://www.w3.org/2002/xforms"
  xmlns:jr="http://openrosa.org/javarosa">
  <h:head>
    <h:title>${xml(title)}</h:title>
    <model>
      <instance>
        <${xml(formId)} id="${xml(formId)}" version="${xml(version)}">
${instanceFields}
        </${xml(formId)}>
      </instance>
${binds}
    </model>
  </h:head>
  <h:body>
    <group>
      <label>${xml(title)}</label>
${body}
    </group>
  </h:body>
</h:html>`;
}

export function buildOpenRosaFormListXml(configuration: Record<string, unknown>, form: OdkForm, origin: string) {
  const deploymentId = clean(configuration.deployment_id);
  const formId = clean(form.form_code);
  const title = clean(form.title) || formId;
  const version = clean(form.version || "1");
  const hash = clean(configuration.xform_hash || "md5:00000000000000000000000000000000");
  const downloadUrl = `${origin}/api/odk/${encodeURIComponent(deploymentId)}/forms/${encodeURIComponent(formId)}.xml`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<xforms xmlns="http://openrosa.org/xforms/xformsList">
  <xform>
    <formID>${xml(formId)}</formID>
    <name>${xml(title)}</name>
    <version>${xml(version)}</version>
    <hash>${xml(hash)}</hash>
    <downloadUrl>${xml(downloadUrl)}</downloadUrl>
  </xform>
</xforms>`;
}

export function parseOdkSubmission(text: string, formCode: string) {
  const answers: Record<string, string> = {};
  const start = text.indexOf(`<${formCode}`);
  const end = text.lastIndexOf(`</${formCode}>`);
  const xmlBody = start >= 0 && end >= 0 ? text.slice(start, end) : text;
  const fieldPattern = /<([A-Za-z_][A-Za-z0-9_]*)\b[^>]*>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = fieldPattern.exec(xmlBody))) {
    const [, key, value] = match;
    if (key === formCode) continue;
    if (/<[A-Za-z_][A-Za-z0-9_]*\b/.test(value)) continue;
    answers[key] = value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .trim();
  }
  return answers;
}
