import { maximusModules } from "@/lib/maximus-modules";

export const maximusUnits = [
  { value: "logistics", label: "Logistique et approvisionnement" },
  { value: "hr", label: "Ressources humaines" },
  { value: "finance", label: "Finance" },
  { value: "production", label: "Production et menus" },
  { value: "sales", label: "Ventes" },
  { value: "assets_fleet", label: "Actifs et flotte" },
  { value: "communications", label: "Communication" },
  { value: "operations", label: "Operations transversales" },
  { value: "executive", label: "Direction" },
] as const;

export const maximusFunctions = ["viewer", "editor", "creator", "validator"] as const;
export type MaximusFunction = typeof maximusFunctions[number];

export function moduleUnit(slug: string) {
  if (slug.startsWith("finance/")) return "finance";
  if (slug.startsWith("hr/")) return "hr";
  if (slug.startsWith("production/") || slug === "menus" || slug === "nutrition-analysis") return "production";
  if (slug.startsWith("sales/")) return "sales";
  if (slug.startsWith("assets/") || slug.startsWith("fleet/")) return "assets_fleet";
  if (slug.startsWith("communications/")) return "communications";
  if (slug.startsWith("supply/") || slug.startsWith("partnerships/")) return "logistics";
  if (slug.startsWith("administration/")) return "executive";
  return "operations";
}

export function modulesForUnit(unit: string) {
  return maximusModules.filter(module => {
    const owner = moduleUnit(module.slug);
    return owner === unit || (unit === "operations" && ["logistics","production","sales","assets_fleet"].includes(owner));
  }).map(module => module.slug);
}

export const maximusAssignableModules = maximusModules
  .filter(module => module.slug !== "administration/users")
  .map(module => ({ value: module.slug, label: module.title, group: module.group }));

export function modulesForAccess(units: string[], moduleAccess: string[] = []) {
  return [...new Set([
    ...units.flatMap(modulesForUnit),
    ...moduleAccess.filter(slug => slug !== "administration/users" && maximusModules.some(module => module.slug === slug)),
  ])];
}

export type MaximusAccess = {
  user_id: string;
  email: string;
  full_name: string;
  role: "staff" | "manager";
  unit: string;
  units: string[];
  module_access: string[];
  is_assistant_admin: boolean;
  is_supervisor: boolean;
  functions: MaximusFunction[];
  central_kitchen?: string | null;
  sale_point?: string | null;
  active: boolean;
};
