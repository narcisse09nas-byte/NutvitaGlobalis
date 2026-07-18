export type ProctoringBookingStatus =
  "pending" | "approved" | "rejected" | "cancelled";
export type ProctoringRoomStatus = "scheduled" | "active" | "closed";
export type IdentityStatus =
  "not_started" | "pending_review" | "verified" | "rejected";
export type IncidentSeverity = "info" | "warning" | "critical";
export type ExamConductRating = "good" | "passable" | "poor";

export type ProctoringPolicy = {
  minimumLeadDays: number;
  maximumCandidates: number;
  identityThreshold: number;
  requireCamera: boolean;
  requireMicrophone: boolean;
  requireScreenShare: boolean;
  requireFullscreen: boolean;
  autoEjectOnCriticalCount: number;
};

export type ExamSlot = {
  id: string;
  courseSlug: string;
  examSlug: string;
  startsAt: string;
  recurrenceGroupId?: string;
  recurrenceWeekday?: number;
  recurrenceTime?: string;
  durationMinutes: number;
  capacity: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type IdentitySubmission = {
  documentType: "passport" | "national_id";
  issuingCountry: string;
  documentNumber: string;
  expiresAt: string;
  documentMediaUrl: string;
  selfieMediaUrl: string;
  consentedAt: string;
  submittedAt: string;
  status: IdentityStatus;
  matchScore: number | null;
  profileDataMatched: boolean | null;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
};

export type ExamBooking = {
  id: string;
  slotId: string;
  userId: string;
  candidateName: string;
  candidateEmail: string;
  courseSlug: string;
  examSlug: string;
  attemptNumber: number;
  paper: ExamPaper;
  status: ProctoringBookingStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  roomCode?: string;
  identity: IdentitySubmission | null;
  integrityStatus?: "pending" | "approved" | "rejected";
  integrityReviewedAt?: string;
  integrityReviewedBy?: string;
  integrityNote?: string;
  conductRating?: ExamConductRating;
  conductReviewedAt?: string;
  conductReviewedBy?: string;
  conductNote?: string;
  attemptId?: string;
  attemptScorePercent?: number;
  attemptPassed?: boolean;
  attemptSubmittedAt?: string;
};

export type TechnicalCheck = {
  camera: boolean;
  microphone: boolean;
  screenShare: boolean;
  fullscreen: boolean;
  checkedAt: string;
};

export type ProctoringIncident = {
  id: string;
  bookingId: string;
  userId: string;
  type:
    | "tab_hidden"
    | "window_blur"
    | "fullscreen_exit"
    | "camera_stopped"
    | "screen_share_stopped"
    | "connection_lost"
    | "identity_change_suspected"
    | "manual_note";
  severity: IncidentSeverity;
  message: string;
  occurredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
};

export type ProctoringAdmission = {
  bookingId: string;
  technicalCheck: TechnicalCheck | null;
  admittedAt?: string;
  ejectedAt?: string;
  ejectionReason?: string;
  lastHeartbeatAt?: string;
  riskScore?: number;
  riskLevel?: "low" | "medium" | "high";
  reviewRequiredAt?: string;
  reviewReason?: string;
};

export type ProctoringStore = {
  version: 2;
  policy: ProctoringPolicy;
  slots: ExamSlot[];
  bookings: ExamBooking[];
  roomStatuses: Record<string, ProctoringRoomStatus>;
  admissions: ProctoringAdmission[];
  incidents: ProctoringIncident[];
};
import type { ExamPaper } from "@/types/exam";
