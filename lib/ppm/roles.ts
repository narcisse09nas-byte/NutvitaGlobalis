// PPM role vocabulary (spec section 31). No database-backed enforcement yet: a role
// assignment only makes sense once it can be scoped to a real portfolio_id/program_id/
// project_id, and those tables don't exist until Sprint 2. This file exists so Sprint 2+
// code has a single typed source of role names instead of ad hoc string literals — the
// real `ppm_role_assignments` table (with RLS and a `has_ppm_role()` helper) lands in
// Sprint 2 alongside the entities these roles are scoped to.

export type PPMRole =
  | "super_admin"
  | "org_admin"
  | "portfolio_manager"
  | "program_manager"
  | "project_manager"
  | "project_officer"
  | "meal_officer"
  | "finance_officer"
  | "procurement_officer"
  | "quality_officer"
  | "technical_lead"
  | "team_member"
  | "viewer"
  | "auditor"
  | "donor_viewer"
  | "asset_manager"
  | "other";

export const PPM_ROLE_LABELS: Record<PPMRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Organisation Admin",
  portfolio_manager: "Portfolio Manager",
  program_manager: "Program Manager",
  project_manager: "Project Manager",
  project_officer: "Project Officer",
  meal_officer: "MEAL Officer",
  finance_officer: "Finance Officer",
  procurement_officer: "Procurement Officer",
  quality_officer: "Quality Officer",
  technical_lead: "Technical Lead",
  team_member: "Team Member",
  viewer: "Viewer",
  auditor: "Auditor",
  donor_viewer: "Donor / Partner Viewer",
  asset_manager: "Asset Manager",
  other: "Autre (a preciser)",
};

export const PPM_ROLES: PPMRole[] = Object.keys(PPM_ROLE_LABELS) as PPMRole[];
