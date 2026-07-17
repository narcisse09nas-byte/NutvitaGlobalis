import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import ts from "typescript";

// The official UI audit covers rendered routes and components. Course payloads
// are validated separately by the Studio publication rules.
const roots = ["app", "components"];
const frenchPattern =
  /[àâçéèêëîïôùûüÿœ]|(?:accueil|ajouter|apprenant|apprentissage|aucun|bienvenue|certificat|chargement|commande|connexion|cours|créer|document|enregistrer|examen|favori|formation|historique|leçon|module|notes|organisation|ouvrir|panier|paramètres|profil|récompense|résultat|retour|supprimer|surveillance|utilisateur|vérifier|terminé|français|durée|présence|réussi|éligible|disponible)/i;
const ignoredAttributes = new Set([
  "className",
  "href",
  "src",
  "id",
  "key",
  "name",
  "type",
  "value",
  "method",
  "action",
  "target",
  "rel",
  "accept",
  "role",
]);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if ([".tsx", ".ts"].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

function propertyName(node) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return "";
}

function isInsideLocalizedCall(node) {
  let current = node.parent;
  while (current) {
    if (
      ts.isCallExpression(current) &&
      ts.isIdentifier(current.expression) &&
      ["text", "localizedText", "apiText"].includes(current.expression.text)
    )
      return true;
    if (
      ts.isConditionalExpression(current) &&
      /\b(?:locale|isFrench|language)\b/.test(current.condition.getText())
    )
      return true;
    if (ts.isStatement(current) || ts.isJsxElement(current)) break;
    current = current.parent;
  }
  return false;
}

function isLocalized(node) {
  const literalValue =
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      ? node.text
      : ts.isJsxText(node)
        ? node.getText().trim()
        : "";
  if (literalValue.includes(" / ") && /[A-Za-z]{4}/.test(literalValue.split(" / ").at(-1) ?? ""))
    return true;
  if (/🇫🇷|French|Français/.test(literalValue)) return true;
  if (isInsideLocalizedCall(node)) return true;
  let ancestor = node.parent;
  while (ancestor && !ts.isStatement(ancestor)) {
    if (
      ts.isObjectLiteralExpression(ancestor) &&
      ts.isPropertyAssignment(ancestor.parent) &&
      ["fr", "frFr"].includes(propertyName(ancestor.parent.name))
    )
      return true;
    ancestor = ancestor.parent;
  }
  const parent = node.parent;
  if (
    ts.isPropertyAssignment(parent) &&
    ["fr", "frFr", "titleFr", "descriptionFr", "labelFr"].includes(
      propertyName(parent.name),
    )
  )
    return true;
  if (ts.isJsxAttribute(parent)) {
    const name = parent.name.getText();
    if (name === "fr" || ignoredAttributes.has(name)) return true;
    const attributes = parent.parent?.properties ?? [];
    if (
      attributes.some(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText() === `${name}En`,
      )
    )
      return true;
  }
  if (ts.isPropertyAssignment(parent)) {
    const name = propertyName(parent.name);
    const properties = ts.isObjectLiteralExpression(parent.parent)
      ? parent.parent.properties
      : [];
    if (
      name &&
      properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          propertyName(property.name) === `${name}En`,
      )
    )
      return true;
  }
  if (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isLiteralTypeNode(parent)
  )
    return true;
  return false;
}

const files = (await Promise.all(roots.map(collect))).flat();
const violations = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function visit(node) {
    let value = "";
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      value = node.text;
    else if (ts.isJsxText(node)) value = node.getText(sourceFile).trim();
    else if (ts.isTemplateExpression(node)) value = node.getText(sourceFile);
    if (value && frenchPattern.test(value) && !isLocalized(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      violations.push({
        file: relative(process.cwd(), file),
        line: position.line + 1,
        sample: value.replace(/\s+/g, " ").slice(0, 100),
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

const affected = new Set(violations.map((item) => item.file));
console.log(
  `i18n audit: ${violations.length} texte(s) non localisé(s) dans ${affected.size} fichier(s).`,
);
for (const item of violations)
  console.log(`- ${item.file}:${item.line} — ${item.sample}`);
process.exitCode = violations.length === 0 ? 0 : 1;
