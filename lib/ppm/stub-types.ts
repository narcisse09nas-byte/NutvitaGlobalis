// Forward-declared placeholder types for PPM entities owned by later sprints.
// Each interface is intentionally minimal ({id, name, status, project_id?}) so cross-entity
// relationships (spec section 38: "Il doit etre possible de naviguer dans les deux sens")
// have a real type to reference from day one, without speccing fields their owning sprint
// hasn't designed yet through real schema + UI work. Do not add fields here speculatively —
// flesh out the real shape in the sprint listed, in its own file, and remove the stub here.

import type { PPMStatus } from "./types";

type Stub = { id: string; name: string; status: PPMStatus; project_id?: string };

// Requirement, ScopeStatement (sprint 5); Indicator, WBSNode, ChangeRequest, Activity
// (sprints 6-9); BudgetLine, PPMResource, ProcurementItem, QualityRequirement, Risk, Issue
// (sprints 11-15); Stakeholder, CommunicationItem, MealEntry, Evaluation, FeedbackEntry,
// LessonLearned, Deliverable, PPMDocument, Report (sprints 16-19); PPMNotification,
// ApprovalRequest, AuditLogEntry, ProjectClosure (sprints 21-23) all graduated to real types
// in ./types.ts.

/** STUB — full shape owned by Sprint 26+ (Donor/Grant module — beyond the core 25-sprint roadmap). */
export type GrantDonor = Stub & { grant_id?: string };
